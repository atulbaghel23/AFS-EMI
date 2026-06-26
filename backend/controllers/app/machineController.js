import Machine from '../../models/Machine.js';
import Category from '../../models/Category.js';

export const getMachines = async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      category,
      paginated,
      minPrice,
      maxPrice,
    } = req.query;

    let filter = {};

    // Search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    // Category
    if (category && category !== "All Categories") {
      filter.category = {
        $regex: new RegExp(`^${category}$`, "i"),
      };
    }

    // Price
    if (minPrice || maxPrice) {
      filter["pricing.totalPrice"] = {};

      if (minPrice) {
        filter["pricing.totalPrice"].$gte = Number(minPrice);
      }

      if (maxPrice) {
        filter["pricing.totalPrice"].$lte = Number(maxPrice);
      }
    }

    // Pagination
    if (paginated === "true" || page) {
      const pageNumber = parseInt(page) || 1;
      const limitNumber = parseInt(limit) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      const machines = await Machine.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limitNumber);

      const total = await Machine.countDocuments(filter);

      return res.json({
        success: true,
        statusCode: 200,
        message: "Data retrieved successfully",
        data: machines,
        pagination: {
          totalRecords: total,
          currentPage: pageNumber,
          perPage: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
          hasNextPage: pageNumber < Math.ceil(total / limitNumber),
          hasPreviousPage: pageNumber > 1,
          nextPage:
            pageNumber < Math.ceil(total / limitNumber)
              ? pageNumber + 1
              : null,
          previousPage:
            pageNumber > 1
              ? pageNumber - 1
              : null,
        },
        filters: {
          category: category || null,
          search: search || null,
          minPrice: minPrice || null,
          maxPrice: maxPrice || null,
        },
      });
    }

    // Non-paginated response
    const machines = await Machine.find(filter).sort({
      createdAt: -1,
      _id: -1,
    });

    return res.json({
      success: true,
      statusCode: 200,
      message: "Data retrieved successfully",
      data: machines,
      total: machines.length,
      page: 1,
      totalPages: Math.ceil(machines.length / 10),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createMachine = async (req, res) => {
  try {
    const machineData = { ...req.body };
    console.log("Received machine data:", JSON.stringify(machineData, null, 2));

    // Ensure nested objects exist to trigger Mongoose schema defaults
    if (!machineData.pricing) machineData.pricing = {};
    if (!machineData.specs) machineData.specs = {};
    if (!machineData.warranty) machineData.warranty = {};
    if (!machineData.attachments) machineData.attachments = [];
    if (!machineData.images) machineData.images = [];

    if (!machineData.machineId) {
      machineData.machineId = `LM-${Math.floor(100000 + Math.random() * 900000)}`;
    }
    const newMachine = new Machine(machineData);
    await newMachine.save();
    res.status(201).json(newMachine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMachine = async (req, res) => {
  try {
    const updateData = { ...req.body };
    console.log("Updating machine ID:", req.params.id);
    console.log("Update payload documents count:", updateData.documents?.length || 0);

    if (updateData.pricing === null) delete updateData.pricing;
    if (updateData.specs === null) delete updateData.specs;
    if (updateData.warranty === null) delete updateData.warranty;
    if (updateData.attachments === null) delete updateData.attachments;
    if (updateData.images === null) delete updateData.images;

    const updatedMachine = await Machine.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedMachine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteMachine = async (req, res) => {
  try {
    const machine = await Machine.findByIdAndDelete(req.params.id);
    if (!machine) {
      return res.status(404).json({ message: 'Machine not found' });
    }
    res.json({ message: 'Machine deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ cat_name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const syncCategories = async (req, res) => {
  try {
    const response = await fetch('https://lipl.sods.app/api/dmobile/getCategories');
    const data = await response.json();

    if (data.status && data.result) {
      const ops = data.result.map(cat => ({
        updateOne: {
          filter: { cat_id: cat.cat_id },
          update: {
            cat_id: cat.cat_id,
            cat_name: cat.cat_name,
            rawData: cat
          },
          upsert: true
        }
      }));

      if (ops.length > 0) {
        await Category.bulkWrite(ops);
      }
      res.json({ message: 'Categories synced successfully', count: ops.length });
    } else {
      res.status(400).json({ message: 'Failed to fetch categories from external API' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const syncProducts = async (req, res) => {
  try {
    const response = await fetch('https://lipl.sods.app/api/dmobile/getProducts');
    const data = await response.json();

    if (data.status && data.result) {
      const ops = data.result.map(prod => {
        const imageUrls = [];
        if (prod.ref_file) {
          imageUrls.push(`https://lipl.sods.app/${prod.ref_file}`);
        } else if (prod.prod_image) {
          imageUrls.push(`https://lipl.sods.app/${prod.prod_image}`);
        }

        const attachments = (prod.attachments || []).map(att => ({
          type: 'Attachment',
          config: att.attach_name,
          capacity: '',
          amount: 0,
          isStandard: true
        }));

        let stdMonths = 12, stdHours = 2000;
        if (prod.prod_std_warranty) {
          const match = prod.prod_std_warranty.match(/(\d+)M\s*\/\s*(\d+)/i);
          if (match) {
            stdMonths = parseInt(match[1]);
            stdHours = parseInt(match[2]);
          }
        }

        return {
          updateOne: {
            filter: { name: prod.prod_name, model: prod.prod_model_type || 'Standard' },
            update: {
              $set: {
                machineId: `PROD-${prod.prod_id}`,
                name: prod.prod_name,
                model: prod.prod_model_type || 'Standard',
                category: prod.category?.cat_name || 'Wheeled',
                machineType: prod.prod_type || 'WHEELED',
                brand: 'LiuGong',
                isFromAPI: true,
                images: imageUrls,
                img: imageUrls[0] || '',
                'pricing.totalPrice': prod.prod_total_price || 0,
                'pricing.oemNetSaleValue': prod.prod_nsv || 0,
                'pricing.commissionA': prod.prod_sale_commision_slot_a || 0,
                'pricing.commissionB': prod.prod_sale_commision_slot_b || 0,
                'pricing.serviceCommission': prod.prod_service_commision || 0,
                'specs.horsePower': prod.prod_house_power || '',
                'specs.fuelType': prod.prod_fuel_used || 'Diesel',
                'specs.cylinders': String(prod.prod_cylinders || ''),
                'specs.year': String(prod.prod_yom || ''),
                'specs.unladenWeight': String(prod.prod_unladen_weight || ''),
                'specs.engineModel': prod.prod_specification || '',
                'warranty.standardMonths': stdMonths,
                'warranty.standardHours': stdHours,
                attachments: attachments
              }
            },
            upsert: true
          }
        };
      });

      if (ops.length > 0) {
        await Machine.bulkWrite(ops);
      }
      res.json({ message: 'Products synced successfully', count: ops.length });
    } else {
      res.status(400).json({ message: 'Failed to fetch products from external API' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

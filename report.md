# Dashboard Reporting Agent Skill

## Purpose

The Dashboard Reporting Agent enables users to generate operational and financial reports for a crane sales, rental, contract, and EMI management platform.

The agent helps users analyze machine utilization, customer activity, revenue, contracts, rentals, and payment performance through dynamic filters and report generation.

---

## Business Context

The platform manages the following business operations:

1. Machine sales with down payment and EMI plans
2. Machine rentals (daily, weekly, monthly)
3. Contract-based machine assignments
4. Customer management
5. Machine inventory and utilization tracking
6. Payment collection and outstanding balances

The reporting system must support all business workflows.

---

## Agent Responsibilities

The agent must:

* Display context-aware filters
* Generate reports based on user-selected criteria
* Apply cascading filters dynamically
* Provide summary KPIs
* Support data export
* Save custom report views
* Enable scheduled report generation

---

## Dashboard Architecture

```text
Dashboard
├── Report Type Selector
│   ├── Machine Reports
│   ├── Customer Reports
│   ├── Sales Reports
│   ├── Rental Reports
│   ├── Contract Reports
│   └── EMI & Payment Reports
│
├── Global Filters
├── Context-Specific Filters
├── Quick Filter Chips
├── KPI Summary Cards
├── Charts & Visualizations
├── Data Table
└── Export Actions
```

---

## Report Types

### 1. Machine Reports

Purpose: Monitor inventory and utilization.

Metrics:

* Total machines
* Available machines
* Active rentals
* Machines under contract
* Machines sold
* Utilization percentage
* Maintenance due

Filters:

* Machine ID
* Machine name
* Machine category
* Brand
* Model
* Location
* Status
* Purchase year
* Utilization range

---

### 2. Customer Reports

Purpose: Analyze customer activity and revenue.

Metrics:

* Total customers
* Active customers
* Customer lifetime value
* Outstanding balances
* Repeat rentals

Filters:

* Customer name
* Customer type
* Industry
* Location
* Sales executive
* Customer status
* Revenue range

---

### 3. Sales Reports

Purpose: Track machine sales and financing.

Metrics:

* Total sales value
* Average down payment
* Active EMI accounts
* Overdue EMI accounts

Filters:

* Invoice number
* Customer
* Machine
* Sales executive
* Sale date
* Down payment range
* EMI status
* Finance provider

---

### 4. Rental Reports

Purpose: Monitor rental operations.

Metrics:

* Active rentals
* Rental revenue
* Machine utilization
* Upcoming returns

Filters:

* Rental type
* Customer
* Machine
* Rental status
* Start date
* End date
* Site location
* Operator assigned

---

### 5. Contract Reports

Purpose: Track project-based machine assignments.

Metrics:

* Active contracts
* Contract revenue
* Machine allocation
* Expiring contracts

Filters:

* Contract number
* Contract type
* Customer
* Project name
* Site location
* Contract status
* Start date
* End date

---

### 6. EMI & Payment Reports

Purpose: Monitor collections and receivables.

Metrics:

* EMI collected
* Outstanding balance
* Overdue payments
* Collection rate

Filters:

* Customer
* Machine
* EMI status
* Due date
* Payment method
* Finance provider

---

## Global Filters

Global filters must be available across all report types.

Filters:

* Date range
* Branch or location
* Sales executive
* Customer type
* Machine category

Requirements:

* Support multi-select
* Support search
* Support custom date ranges

---

## Cascading Filter Rules

Filters must update dynamically based on previous selections.

Examples:

* Selecting a customer limits available machines to customer-related records.
* Selecting a machine category limits available models.
* Selecting a branch limits customers and contracts to that branch.

Invalid filter combinations must be prevented.

---

## Filter UI Guidelines

Requirements:

* Use searchable multi-select dropdowns.
* Group advanced filters under "More Filters".
* Persist selected filters during navigation.
* Display active filters as removable chips.
* Provide a "Reset Filters" action.

Example:

```text
Date Range: This Month ×
Location: Bhopal ×
Machine Status: Active ×
```

---

## Quick Filter Presets

Provide one-click shortcuts for frequently used reports.

Examples:

* Active Rentals
* Overdue EMIs
* Expiring Contracts
* Idle Machines
* Available Machines
* High-Value Customers

---

## KPI Cards

Display KPI cards above charts and tables.

Examples:

* Total Revenue
* Rental Revenue
* Sales Revenue
* Active Contracts
* Available Machines
* EMI Collection Rate

KPIs must update instantly when filters change.

---

## Charts

Recommended visualizations:

* Revenue trends (line chart)
* Machine utilization (bar chart)
* Contract status distribution (pie chart)
* EMI collection trends (area chart)
* Top customers (horizontal bar chart)

Charts must respect active filters.

---

## Data Table Requirements

The report table must support:

* Sorting
* Pagination
* Column visibility controls
* Search within results
* Row expansion for details

---

## Export Options

Supported formats:

* Excel
* CSV
* PDF

Export actions:

* Export current page
* Export filtered results
* Export all data

Exports must include applied filter metadata.

---

## Saved Views

Users can save filter configurations.

Example:

```text
My Reports
├── Monthly Sales Review
├── Overdue EMI Report
├── Active Contracts
└── Available Cranes
```

Saved views must store:

* Report type
* Selected filters
* Visible columns
* Sorting preferences

---

## Scheduled Reports

Users can schedule automatic report delivery.

Supported frequencies:

* Daily
* Weekly
* Monthly

Delivery methods:

* Email
* Download center

---

## Performance Requirements

* Dashboard load time: less than 3 seconds
* Filter updates: less than 1 second
* Report export initiation: less than 5 seconds

Use:

* Server-side pagination
* Indexed database columns
* Cached KPI calculations
* Lazy loading for charts

---

## Access Control

Role-based visibility must be enforced.

Examples:

* Admin: Access all reports
* Sales Manager: Sales and customer reports
* Rental Manager: Rental and contract reports
* Finance Team: EMI and payment reports

Users must only access authorized data.

---

## Success Criteria

The dashboard implementation is successful when users can:

1. Generate any report within three clicks.
2. Apply filters without page reloads.
3. Export filtered data easily.
4. Save frequently used report views.
5. Identify business insights quickly through KPIs and charts.

```
```
┌─────────────────────────────────────┐
│ Report Type: EMI Report             │
├─────────────────────────────────────┤
│ Date Filters                        │
│ Financial Filters                   │
│ EMI Status Filters                  │
│ Customer Filters                    │
│ Machine Filters                     │
│ Advanced Conditions                 │
└─────────────────────────────────────┘
1. Date Filters

Provide both preset ranges and custom ranges.

Quick Date Presets
○ Today
○ Yesterday
○ This Week
○ Last Week
○ This Month
○ Last Month
○ This Quarter
○ This Year
○ Custom Range

Custom Date Range

Allow users to choose:

Date Type: [ EMI Due Date ▼ ]

From: [ 01/06/2026 ]
To:   [ 30/06/2026 ]
Important: Support Multiple Date Types

Users may want reports based on different dates.

Date Type:
- Sale Date
- EMI Due Date
- Payment Date
- Contract Start Date
- Contract End Date
- Rental Start Date
- Rental End Date

2. Financial Filters

Use a dual-range slider plus manual input.

Down Payment Amount

Min: ₹ 50,000
Max: ₹ 5,00,000
EMI Amount

Min: ₹ 10,000
Max: ₹ 1,00,000
Outstanding Balance

Min: ₹ 0
Max: ₹ 10,00,000
UX Recommendation

Provide both:

Slider for quick selection
Numeric input for exact values

Example:

₹ 50,000 ─────────●───────●──────── ₹ 5,00,000
3. EMI Status Filters

Use multi-select checkboxes.

☑ Upcoming EMIs
☑ Overdue EMIs
☑ Paid EMIs
☑ Unpaid EMIs
☐ Partially Paid EMIs
☐ Closed Accounts
EMI Status Definitions
Status	Logic
Upcoming	Due date > today AND payment not received
Overdue	Due date < today AND payment not received
Paid	Payment received in full
Unpaid	No payment received
Partially Paid	Partial amount received
Closed	All EMIs completed

These rules should be calculated automatically by the backend.

4. Overdue Filters

Allow additional conditions.

Days Overdue

Min: 1
Max: 180

Quick chips:

[1–30 Days]
[31–60 Days]
[61–90 Days]
[90+ Days]
5. Customer Filters
Customer Name        [ Search ]
Customer Type        [ Company ▼ ]
Location             [ Multi-select ]
Sales Executive      [ Multi-select ]
6. Machine Filters
Machine Category     [ Crane ▼ ]
Machine Model        [ Multi-select ]
Machine Status       [ Sold ▼ ]
7. Advanced Filter Builder

Allow users to combine conditions.

Example:

Show records where:

(EMI Status = Overdue)
AND
(Outstanding Amount > ₹50,000)
AND
(Customer Type = Company)
AND
(Days Overdue > 30)

Support:

AND conditions
OR conditions
Nested groups
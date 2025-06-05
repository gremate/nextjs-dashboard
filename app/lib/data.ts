import sql from "mssql";
import { CustomerField, CustomersTableType, InvoiceForm, InvoicesTable, LatestInvoiceRaw, Revenue } from "./definitions";
import { formatCurrency } from "./utils";
import { sqlConfig } from "./sql-config";

await sql.connect(sqlConfig);

export async function fetchRevenue() {
    try {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const result = await sql.query<Revenue>`SELECT * FROM revenue`;

        return result.recordset;
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch revenue data.");
    }
}

export async function fetchLatestInvoices() {
    try {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const result = await sql.query<LatestInvoiceRaw>`
            SELECT TOP 5 invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
            FROM invoices
            JOIN customers ON invoices.customer_id = customers.id
            ORDER BY invoices.date DESC
        `;
        const latestInvoices = result.recordset.map((invoice) => ({
            ...invoice,
            amount: formatCurrency(invoice.amount)
        }));

        return latestInvoices;
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch the latest invoices.");
    }
}

export async function fetchCardData() {
    try {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const invoiceCountPromise = sql.query`SELECT COUNT(*) FROM invoices`;
        const customerCountPromise = sql.query`SELECT COUNT(*) FROM customers`;
        const invoiceStatusPromise = sql.query`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

        const data = await Promise.all([invoiceCountPromise, customerCountPromise, invoiceStatusPromise]);

        const numberOfInvoices: number = data[0].recordset[0][""];
        const numberOfCustomers: number = data[1].recordset[0][""];
        const totalPaidInvoices = formatCurrency(data[2].recordset[0].paid);
        const totalPendingInvoices = formatCurrency(data[2].recordset[0].pending);

        return {
            numberOfCustomers,
            numberOfInvoices,
            totalPaidInvoices,
            totalPendingInvoices
        };
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch card data.");
    }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(query: string, currentPage: number) {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    try {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const result = await sql.query<InvoicesTable>`
            SELECT invoices.id, invoices.amount, invoices.date, invoices.status, customers.name, customers.email, customers.image_url
            FROM invoices
            JOIN customers ON invoices.customer_id = customers.id
            WHERE
                customers.name COLLATE SQL_Latin1_General_CP1_CI_AS LIKE ${`%${query}%`} OR
                customers.email COLLATE SQL_Latin1_General_CP1_CI_AS LIKE ${`%${query}%`} OR
                CAST(invoices.amount AS NVARCHAR) LIKE ${`%${query}%`} OR
                CAST(invoices.date AS NVARCHAR) LIKE ${`%${query}%`} OR
                invoices.status COLLATE SQL_Latin1_General_CP1_CI_AS LIKE ${`%${query}%`}
            ORDER BY invoices.date DESC
            OFFSET ${offset} ROWS FETCH NEXT ${ITEMS_PER_PAGE} ROWS ONLY
        `;

        return result.recordset;
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch invoices.");
    }
}

export async function fetchInvoicesPages(query: string) {
    try {
        const result = await sql.query`
            SELECT COUNT(*)
            FROM invoices
            JOIN customers ON invoices.customer_id = customers.id
            WHERE
                customers.name COLLATE SQL_Latin1_General_CP1_CI_AS LIKE ${`%${query}%`} OR
                customers.email COLLATE SQL_Latin1_General_CP1_CI_AS LIKE ${`%${query}%`} OR
                CAST(invoices.amount AS NVARCHAR) LIKE ${`%${query}%`} OR
                CAST(invoices.date AS NVARCHAR) LIKE ${`%${query}%`} OR
                invoices.status COLLATE SQL_Latin1_General_CP1_CI_AS LIKE ${`%${query}%`}
        `;

        return Math.ceil(result.recordset[0][""] / ITEMS_PER_PAGE);
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch total number of invoices.");
    }
}

export async function fetchInvoiceById(id: string) {
    try {
        const result = await sql.query<InvoiceForm>`
            SELECT invoices.id, invoices.customer_id, invoices.amount, invoices.status
            FROM invoices
            WHERE invoices.id = ${id};
        `;

        return result.recordset.length ? { ...result.recordset[0], amount: result.recordset[0].amount / 100 } : undefined;
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch invoice.");
    }
}

export async function fetchCustomers() {
    try {
        const result = await sql.query<CustomerField>`
            SELECT id, name
            FROM customers
            ORDER BY name ASC
        `;

        return result.recordset;
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch all customers.");
    }
}

// export async function fetchFilteredCustomers(query: string) {
//     try {
//         const data = await sql<CustomersTableType[]>`
// 		SELECT
// 		  customers.id,
// 		  customers.name,
// 		  customers.email,
// 		  customers.image_url,
// 		  COUNT(invoices.id) AS total_invoices,
// 		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
// 		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
// 		FROM customers
// 		LEFT JOIN invoices ON customers.id = invoices.customer_id
// 		WHERE
// 		  customers.name ILIKE ${`%${query}%`} OR
//         customers.email ILIKE ${`%${query}%`}
// 		GROUP BY customers.id, customers.name, customers.email, customers.image_url
// 		ORDER BY customers.name ASC
// 	  `;

//         const customers = data.map((customer) => ({
//             ...customer,
//             total_pending: formatCurrency(customer.total_pending),
//             total_paid: formatCurrency(customer.total_paid)
//         }));

//         return customers;
//     } catch (err) {
//         console.error("Database Error:", err);
//         throw new Error("Failed to fetch customer table.");
//     }
// }

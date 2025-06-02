import bcrypt from "bcrypt";
import sql from "mssql";
import { invoices, customers, revenue, users } from "@/app/lib/placeholder-data";
import { sqlConfig } from "@/app/lib/sql-config";

async function seedUsers() {
    await sql.query`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
      CREATE TABLE users (
        id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password NVARCHAR(255) NOT NULL
      );
    `;

    await Promise.all(
        users.map(async (user) => {
            const hashedPassword = await bcrypt.hash(user.password, 10);

            return sql.query`
              IF NOT EXISTS (SELECT 1 FROM users WHERE id = ${user.id})
              BEGIN
                INSERT INTO users (id, name, email, password)
                VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
              END
            `;
        })
    );
}

async function seedInvoices() {
    await sql.query`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='invoices' AND xtype='U')
      CREATE TABLE invoices (
        id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        customer_id UNIQUEIDENTIFIER NOT NULL,
        amount INT NOT NULL,
        status NVARCHAR(255) NOT NULL,
        date DATE NOT NULL
      );
    `;

    await Promise.all(
        invoices.map(
            (invoice) => sql.query`
              IF NOT EXISTS (SELECT 1 FROM invoices WHERE customer_id = ${invoice.customer_id} AND amount = ${invoice.amount} AND status = ${invoice.status} AND date = ${invoice.date})
              BEGIN
                INSERT INTO invoices (customer_id, amount, status, date)
                VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
              END
            `
        )
    );
}

async function seedCustomers() {
    await sql.query`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='customers' AND xtype='U')
      CREATE TABLE customers (
        id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) NOT NULL,
        image_url NVARCHAR(255) NOT NULL
      );
    `;

    await Promise.all(
        customers.map(
            (customer) => sql.query`
              IF NOT EXISTS (SELECT 1 FROM customers WHERE id = ${customer.id})
              BEGIN
                INSERT INTO customers (id, name, email, image_url)
                VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
              END
            `
        )
    );
}

async function seedRevenue() {
    await sql.query`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='revenue' AND xtype='U')
      CREATE TABLE revenue (
        month NVARCHAR(4) NOT NULL UNIQUE,
        revenue INT NOT NULL
      );
    `;

    await Promise.all(
        revenue.map(
            (rev) => sql.query`
              IF NOT EXISTS (SELECT 1 FROM revenue WHERE month = ${rev.month})
              BEGIN
                INSERT INTO revenue (month, revenue)
                VALUES (${rev.month}, ${rev.revenue})
              END
            `
        )
    );
}

export async function GET() {
    try {
        await sql.connect(sqlConfig);
        await seedUsers();
        await seedCustomers();
        await seedInvoices();
        await seedRevenue();

        return Response.json({ message: "Database seeded successfully" });
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}

"use server";
import { z } from "zod";
import sql from "mssql";
import { sqlConfig } from "./sql-config";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

await sql.connect(sqlConfig);

const InvoiceSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: "Please select a customer"
    }),
    amount: z.coerce.number().gt(0, { message: "Please enter an amount greater than $0." }),
    status: z.enum(["pending", "paid"], {
        invalid_type_error: "Please select an invoice status."
    }),
    date: z.string()
});
const CreateInvoice = InvoiceSchema.omit({ id: true, date: true });
const UpdateInvoice = InvoiceSchema.omit({ id: true, date: true });

export interface State {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
    formData?: FormData;
}

export async function createInvoice(prevState: State, formData: FormData): Promise<State> {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status")
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Create Invoice.",
            formData
        };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split("T")[0];

    try {
        await sql.query`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (error) {
        console.error(error);
        return { message: "Database Error: Failed to Create Invoice.", formData };
    }

    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
}

export async function updateInvoice(id: string, prevState: State, formData: FormData): Promise<State> {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status")
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Update Invoice.",
            formData
        };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;

    try {
        await sql.query`
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
        `;
    } catch (error) {
        console.error(error);
        return { message: "Database Error: Failed to Update Invoice.", formData };
    }

    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
    try {
        await sql.query`DELETE FROM invoices WHERE id = ${id}`;
    } catch (error) {
        console.error(error);
    }

    revalidatePath("/dashboard/invoices");
}

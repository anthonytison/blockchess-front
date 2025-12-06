'use server'

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers"

/**
 * saveCookie
 * @param { name: string, value: string } 
 */
export const saveCookie = async ({ name, value, path }: { name: string, value: string, path?: string }) => {
    const cookiesList = await cookies();
    cookiesList.set({
        name,
        value,
        domain: process.env.COOKIE_DOMAIN as string,
        httpOnly: process.env.NODE_ENV === "development",
        secure: process.env.NODE_ENV !== "development",
        path: "/"
    })
    if(path) revalidatePath(path)
}

export const getCookie = async (name: string): Promise<string | null> => {
    const cookiesList = await cookies();

    if (cookiesList.has(name)) {
        return cookiesList.get(name)?.value as string;
    }
    return null;
}

export const deleteCookie = async (name: string): Promise<boolean> => {
    try {
        const cookiesList = await cookies();

        if (cookiesList.has(name)) {
            cookiesList.delete(name)
            return true;
        }
        return false;
    } catch (e) {
        console.log('__ERROR deleteCookie', (e as Error).message);
        return false;
    }
}
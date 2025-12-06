import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getLocalStorage = (key: string, format: "string" | "json" = "string"): null | string | object => {
  if(typeof localStorage !== "undefined"){
    const value: string | null = localStorage.getItem(key);
    return value ? format === "string" ? value : JSON.parse(value) : null;
  }
  return null;
}

export const saveLocalStorage = (key: string, value: string) => {
  if(typeof localStorage !== "undefined"){
    localStorage.setItem(key, value)
  }
}

export const clearLocalStorage = (key: string) => {
  if(typeof localStorage !== "undefined"){
    localStorage.removeItem(key)
  }
}
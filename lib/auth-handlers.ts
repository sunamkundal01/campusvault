// Separate file to keep the route handler import surface small.
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;

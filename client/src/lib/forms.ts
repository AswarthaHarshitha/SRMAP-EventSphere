import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { ApiError, errorMessage } from "./api";

/** Maps server-side field errors onto the form, falling back to a toast. */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, title = "Couldn't save") {
  if (error instanceof ApiError && error.fields && Object.keys(error.fields).length) {
    for (const [field, message] of Object.entries(error.fields)) setError(field as Path<T>, { message });
    return;
  }
  toast({ variant: "destructive", title, description: errorMessage(error) });
}

import { timezone } from "@/lib/tz";

/** Runs once when the server starts: a bad TIMEZONE fails here with a clear message, not as a 500 on the first page. */
export function register() {
  timezone();
}

import { redirect } from "next/navigation";

export default function MedicinePage() {
  redirect("/search?tab=medicines");
}

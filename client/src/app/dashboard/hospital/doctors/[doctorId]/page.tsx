import { redirect } from "next/navigation";

/** Old URLs now open the doctors list; doctor detail is shown in a dialog from that page. */
export default function HospitalDoctorLegacyRoute() {
  redirect("/dashboard/hospital/doctors");
}

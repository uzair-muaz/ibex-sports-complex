import { getCourts } from "@/app/actions/courts";
import { FacilitiesSection } from "@/components/sections/FacilitiesSection";

export async function FacilitiesWithCourts() {
  const result = await getCourts();
  const courts = result.success ? result.courts : [];

  const padelCourts = courts.filter((c: { type: string }) => c.type === "PADEL");
  const cricketCourts = courts.filter((c: { type: string }) => c.type === "CRICKET");
  const pickleballCourts = courts.filter((c: { type: string }) => c.type === "PICKLEBALL");
  const futsalCourts = courts.filter((c: { type: string }) => c.type === "FUTSAL");

  return (
    <FacilitiesSection
      padelCourts={padelCourts}
      cricketCourts={cricketCourts}
      pickleballCourts={pickleballCourts}
      futsalCourts={futsalCourts}
    />
  );
}

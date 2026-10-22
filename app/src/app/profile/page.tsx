import type { Metadata } from "next";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <h1>Profile</h1>
      <p className="lede">
        These fields start empty. Fill in only what you want a worker to see. Saving keeps the notes
        on this site. It does not edit the core project.
      </p>
      <ProfileForm />
    </>
  );
}

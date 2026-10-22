import type { Metadata } from "next";
import { ApplyForm } from "@/components/ApplyForm";

export const metadata: Metadata = { title: "Start an application" };

export default function ApplyPage() {
  return (
    <>
      <h1>Start an application</h1>
      <p className="lede">
        Paste a link, the job text, or both. This page does not open the link. Pasted text is the
        copy a worker should use. The writing steps stay in the core instructions.
      </p>
      <ApplyForm />
    </>
  );
}

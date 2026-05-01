import { useEffect, useState } from "react";
import type { Profile } from "@job-tracker/shared";
import { profileApi } from "../api/profile.ts";
import { Input, Textarea } from "../components/ui/Input.tsx";
import { Button } from "../components/ui/Button.tsx";
import styles from "./ProfilePage.module.css";

const EMPTY: Partial<Profile> & { ein: string } = {
  businessName: "",
  yourName: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
  ein: "",
  website: "",
  defaultTaxRate: "0",
  defaultPaymentTerms: "Net 30",
  paymentInstructions: "",
};

export function ProfilePage() {
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    profileApi.get().then((p) => {
      if (p) {
        setForm({
          businessName: p.businessName ?? "",
          yourName: p.yourName ?? "",
          email: p.email ?? "",
          phone: p.phone ?? "",
          street: p.street ?? "",
          city: p.city ?? "",
          state: p.state ?? "",
          zip: p.zip ?? "",
          country: p.country ?? "US",
          ein: p.ein ?? "",
          website: p.website ?? "",
          defaultTaxRate: p.defaultTaxRate ?? "0",
          defaultPaymentTerms: p.defaultPaymentTerms ?? "Net 30",
          paymentInstructions: p.paymentInstructions ?? "",
        });
      }
    }).catch(console.error);
  }, []);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await profileApi.update(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>My Profile</h1>
      <p className={styles.subtitle}>Used on invoices sent to clients.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Business</h2>
          <Input label="Business / LLC Name" value={form.businessName ?? ""} onChange={set("businessName")} autoComplete="organization" />
          <Input label="Your Name" value={form.yourName ?? ""} onChange={set("yourName")} autoComplete="name" />
          <Input label="Email" type="email" value={form.email ?? ""} onChange={set("email")} autoComplete="email" />
          <Input label="Phone" type="tel" value={form.phone ?? ""} onChange={set("phone")} autoComplete="tel" />
          <Input label="Website" type="url" value={form.website ?? ""} onChange={set("website")} placeholder="https://" autoComplete="url" />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Address</h2>
          <Input label="Street" value={form.street ?? ""} onChange={set("street")} autoComplete="street-address" />
          <div className={styles.row}>
            <Input label="City" value={form.city ?? ""} onChange={set("city")} autoComplete="address-level2" />
            <Input label="State" value={form.state ?? ""} onChange={set("state")} autoComplete="address-level1" />
            <Input label="Zip" value={form.zip ?? ""} onChange={set("zip")} autoComplete="postal-code" />
          </div>
          <Input label="Country" value={form.country ?? ""} onChange={set("country")} autoComplete="country-name" />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Tax</h2>
          <Input
            label="EIN / Tax ID"
            value={form.ein ?? ""}
            onChange={set("ein")}
            placeholder="XX-XXXXXXX"
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Invoice Defaults</h2>
          <Input
            label="Default Tax Rate"
            type="number"
            step="0.0001"
            value={form.defaultTaxRate ?? ""}
            onChange={set("defaultTaxRate")}
            placeholder="0.0875"
          />
          <Input
            label="Default Payment Terms"
            value={form.defaultPaymentTerms ?? ""}
            onChange={set("defaultPaymentTerms")}
            placeholder="Net 30"
          />
          <Textarea
            label="Payment Instructions"
            value={form.paymentInstructions ?? ""}
            onChange={set("paymentInstructions")}
            placeholder="e.g. ACH: routing 123456789, account 987654321&#10;or Venmo @yourhandle"
          />
        </section>

        <div className={styles.footer}>
          <Button type="submit">Save Profile</Button>
          {saved && <span className={styles.savedMsg}>Saved!</span>}
        </div>
      </form>
    </div>
  );
}

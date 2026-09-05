export type TemplateKey =
  | "payment_failed_update_method"
  | "payment_retry_success"
  | "payment_reminder"
  | "discount_offer"
  | "final_notice";
export type Language = "en" | "hi";

const templates: Record<Language, Record<TemplateKey, { subject?: string; body: string }>> = {
  en: {
    payment_failed_update_method: { subject: "Payment update required", body: "Hi {{customer_name}}, your payment of ₹{{amount}} failed. Update your payment method here: {{link}}" },
    payment_retry_success: { subject: "Payment successful", body: "Great! Your payment of ₹{{amount}} was successful. Thank you!" },
    payment_reminder: { subject: "Payment reminder", body: "Reminder: complete your payment of ₹{{amount}} here: {{link}}" },
    discount_offer: { subject: "A discount for you", body: "Get ₹{{discount}} off. Use code {{code}} within {{hours}} hours." },
    final_notice: { subject: "Final payment reminder", body: "Last reminder: complete your payment of ₹{{amount}} to avoid service suspension. {{link}}" },
  },
  hi: {
    payment_failed_update_method: { subject: "भुगतान अपडेट आवश्यक", body: "नमस्ते {{customer_name}}, आपका ₹{{amount}} का भुगतान विफल हो गया। यहां अपडेट करें: {{link}}" },
    payment_retry_success: { subject: "भुगतान सफल", body: "बहुत बढ़िया! आपका ₹{{amount}} का भुगतान सफल हो गया। धन्यवाद!" },
    payment_reminder: { subject: "भुगतान अनुस्मारक", body: "अनुस्मारक: ₹{{amount}} का भुगतान यहां पूरा करें: {{link}}" },
    discount_offer: { subject: "आपके लिए छूट", body: "₹{{discount}} की छूट पाएं। {{hours}} घंटे में {{code}} कोड इस्तेमाल करें।" },
    final_notice: { subject: "अंतिम भुगतान अनुस्मारक", body: "अंतिम याद: सेवा बंद होने से पहले ₹{{amount}} का भुगतान करें। {{link}}" },
  },
};

export function renderTemplate(key: TemplateKey, language: string, variables: Record<string, unknown>) {
  const lang = language === "hi" ? "hi" : "en";
  const template = templates[lang][key] ?? templates.en.payment_failed_update_method;
  const replace = (value: string) => value.replace(/{{\s*([\w]+)\s*}}/g, (_, name: string) => String(variables[name] ?? `[${name}]`));
  return { subject: template.subject ? replace(template.subject) : undefined, body: replace(template.body) };
}

export function listTemplates() {
  return (Object.keys(templates.en) as TemplateKey[]).flatMap((key) => [
    { template_key: key, language: "en", ...templates.en[key] },
    { template_key: key, language: "hi", ...templates.hi[key] },
  ]);
}

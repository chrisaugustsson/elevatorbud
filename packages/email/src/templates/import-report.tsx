import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface ImportReportData {
  created: number;
  updated: number;
  errors: { hissnummer: string; error: string }[];
  orgsCreated: string[];
  adminEmail: string;
  timestamp: string;
}

export function ImportReportEmail({
  created,
  updated,
  errors,
  orgsCreated,
  timestamp,
}: ImportReportData) {
  const total = created + updated;
  const hasErrors = errors.length > 0;

  return (
    <Html>
      <Head />
      <Preview>
        {`Importrapport: ${total} hissar behandlade${hasErrors ? `, ${errors.length} fel` : ""}`}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Importrapport — Hisskompetens</Heading>
          <Text style={timestamp_text}>{timestamp}</Text>
          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={subheading}>
              Sammanfattning
            </Heading>
            <Text style={text}>
              <strong>{total}</strong> hissar behandlade totalt
            </Text>
            <Text style={stat}>
              Nya hissar: <strong>{created}</strong>
            </Text>
            <Text style={stat}>
              Uppdaterade hissar: <strong>{updated}</strong>
            </Text>
            {hasErrors && (
              <Text style={stat_error}>
                Fel: <strong>{errors.length}</strong>
              </Text>
            )}
          </Section>

          {orgsCreated.length > 0 && (
            <Section>
              <Hr style={hr} />
              <Heading as="h2" style={subheading}>
                Nya organisationer skapade
              </Heading>
              {orgsCreated.map((org) => (
                <Text key={org} style={list_item}>
                  {org}
                </Text>
              ))}
            </Section>
          )}

          {hasErrors && (
            <Section>
              <Hr style={hr} />
              <Heading as="h2" style={subheading}>
                Fel vid import
              </Heading>
              {errors.slice(0, 50).map((err, i) => (
                <Text key={i} style={error_item}>
                  <strong>{err.hissnummer}</strong>: {err.error}
                </Text>
              ))}
              {errors.length > 50 && (
                <Text style={text}>
                  ... och {errors.length - 50} ytterligare fel
                </Text>
              )}
            </Section>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Detta meddelande skickades automatiskt från Hisskompetens
            importverktyg.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "24px",
  maxWidth: "600px",
  borderRadius: "8px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "700" as const,
  color: "#1a1a2e",
  margin: "0 0 4px",
};

const subheading = {
  fontSize: "18px",
  fontWeight: "600" as const,
  color: "#1a1a2e",
  margin: "16px 0 8px",
};

const text = {
  fontSize: "14px",
  color: "#374151",
  margin: "4px 0",
};

const timestamp_text = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0 0 16px",
};

const stat = {
  fontSize: "14px",
  color: "#374151",
  margin: "2px 0",
  paddingLeft: "12px",
};

const stat_error = {
  fontSize: "14px",
  color: "#dc2626",
  margin: "2px 0",
  paddingLeft: "12px",
  fontWeight: "600" as const,
};

const list_item = {
  fontSize: "14px",
  color: "#374151",
  margin: "2px 0",
  paddingLeft: "12px",
};

const error_item = {
  fontSize: "13px",
  color: "#dc2626",
  margin: "2px 0",
  paddingLeft: "12px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "16px 0",
};

const footer = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "16px 0 0",
};

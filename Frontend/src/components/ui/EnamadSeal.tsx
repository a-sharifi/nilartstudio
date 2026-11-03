"use client";

const verificationCode = "FourQAyuIIGoaWZjLSbvQ3ZjEcpOKO3L";
const sealQuery = `id=8242686&Code=${verificationCode}`;

export default function EnamadSeal({ english = false }: { english?: boolean }) {
  return (
    <a
      className="enamad-seal"
      referrerPolicy="origin"
      target="_blank"
      rel="noopener"
      href={`https://trustseal.enamad.ir/?${sealQuery}`}
      aria-label={english ? "Verify NilArt eNamad trust seal (opens in a new tab)" : "استعلام نماد اعتماد الکترونیکی نیل‌آرت (در پنجره جدید)"}
    >
      <img
        referrerPolicy="origin"
        src={`https://trustseal.enamad.ir/logo.aspx?${sealQuery}`}
        alt={english ? "eNamad trust seal" : "نماد اعتماد الکترونیکی"}
        width="120"
        height="130"
        onError={(event) => { event.currentTarget.style.display = "none"; }}
        {...{ code: verificationCode }}
      />
      <span>{english ? "Verify eNamad" : "استعلام نماد اعتماد"}</span>
    </a>
  );
}

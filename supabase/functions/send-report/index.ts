// send-report: builds the PDF inspection report, stores it, and emails it
// to the client via SMTP (nodemailer). Idempotent; safe to re-invoke.
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';
import { renderReport, type ReportData } from './pdf.ts';

type Body = { inspection_id?: string; resend?: boolean; override_email?: string };

const REC_SENTENCE = {
  buy: 'Recommendation: BUY — the vehicle is in good condition and ready to purchase.',
  negotiate: 'Recommendation: NEGOTIATE — the vehicle has issues that should be addressed.',
  walk_away: 'Recommendation: WALK AWAY — the vehicle has major issues or too many red flags.',
} as const;

function fail(stage: string, message: string, status = 500) {
  return new Response(JSON.stringify({ ok: false, stage, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail('request', 'POST only', 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail('request', 'Invalid JSON body', 400);
  }
  const inspectionId = body.inspection_id;
  if (!inspectionId) return fail('request', 'inspection_id is required', 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ---- Load everything ----
  const { data: insp, error: iErr } = await supabase
    .from('inspections')
    .select('*, client:clients(*), vehicle:vehicles(*), inspector:profiles(*)')
    .eq('id', inspectionId)
    .single();
  if (iErr || !insp) return fail('load', iErr?.message ?? 'Inspection not found', 404);
  if (insp.status !== 'completed') return fail('load', 'Inspection is not completed yet', 400);

  const [{ data: results, error: rErr }, { data: items, error: itErr }, { data: sections, error: sErr }, { data: photos }] =
    await Promise.all([
      supabase.from('inspection_results').select('*').eq('inspection_id', inspectionId),
      supabase.from('checklist_items').select('*').order('sort_order'),
      supabase.from('checklist_sections').select('*').order('sort_order'),
      supabase.from('inspection_photos').select('*').eq('inspection_id', inspectionId).order('sort_order'),
    ]);
  if (rErr || itErr || sErr) return fail('load', rErr?.message ?? itErr?.message ?? sErr?.message ?? 'load failed');

  const resultByItem = new Map<number, { result: ReportData['sections'][0]['items'][0]['result']; note: string | null }>();

  for (const r of results ?? []) resultByItem.set(r.item_id, { result: r.result, note: r.note });

  const dateStr = new Date(insp.completed_at ?? insp.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const companyName = insp.inspector?.company_name || Deno.env.get('SMTP_FROM_NAME') || 'Vehicle Inspections';

  // ---- PDF (reuse stored one on resend) ----
  let pdfBytes: Uint8Array | null = null;
  let pdfPath: string = insp.pdf_path ?? `inspections/${inspectionId}/report.pdf`;

  if (insp.pdf_path && body.resend) {
    const { data: existing } = await supabase.storage.from('reports').download(insp.pdf_path);
    if (existing) pdfBytes = new Uint8Array(await existing.arrayBuffer());
  }

  if (!pdfBytes) {
    // photos + signature
    const photoBytes: Uint8Array[] = [];
    for (const photo of photos ?? []) {
      const { data } = await supabase.storage.from('inspection-photos').download(photo.storage_path);
      if (data) photoBytes.push(new Uint8Array(await data.arrayBuffer()));
    }
    let signature: Uint8Array | null = null;
    if (insp.signature_path) {
      const { data } = await supabase.storage.from('signatures').download(insp.signature_path);
      if (data) signature = new Uint8Array(await data.arrayBuffer());
    }

    const v = insp.vehicle ?? {};
    const reportData: ReportData = {
      inspectionId: inspectionId.slice(0, 8).toUpperCase(),
      date: dateStr,
      companyName,
      inspectorName: insp.inspector?.full_name ?? '',
      buyerName: insp.client?.full_name ?? '',
      sellerName: insp.seller ?? '',
      vehicle: {
        year: v.year != null ? String(v.year) : '',
        make: v.make ?? '',
        model: v.model ?? '',
        trim: v.trim ?? '',
        vin: v.vin ?? v.chassis_number ?? '',
        plate: v.registration_plate ?? '',
        odometer: insp.odometer_km != null ? `${insp.odometer_km} km` : '',
        transmission: v.transmission ?? '',
        drivetrain: v.drive_type ?? '',
        exteriorColor: v.colour ?? '',
        fuelType: v.fuel_type ?? '',
        askingPrice: insp.purchase_price != null ? String(insp.purchase_price) : '',
      },
      sections: (sections ?? []).map((s) => ({
        title: s.title,
        kind: s.kind,
        items: (items ?? [])
          .filter((i) => i.section_id === s.id)
          .map((i) => ({
            number: i.item_number,
            label: i.label,
            description: i.description ?? null,
            result: resultByItem.get(i.id)?.result ?? null,
            note: resultByItem.get(i.id)?.note ?? null,
          })),
      })),
      damageMarks: Array.isArray(insp.damage_marks) ? insp.damage_marks : [],
      obd: {
        ready: insp.obd_ready,
        codes: insp.obd_codes ?? '',
        notes: insp.obd_notes ?? '',
      },
      score: insp.overall_score ?? 0,
      estimatedRepairCost: insp.estimated_repair_cost != null ? String(insp.estimated_repair_cost) : '',
      recommendation: insp.recommendation ?? 'negotiate',
      notes: insp.inspector_notes ?? '',
      photos: photoBytes,
      signature,
    };

    try {
      pdfBytes = await renderReport(reportData);
    } catch (e) {
      return fail('pdf', `PDF generation failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    const { error: upErr } = await supabase.storage
      .from('reports')
      .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true });
    if (upErr) return fail('pdf', `PDF upload failed: ${upErr.message}`);
    await supabase.from('inspections').update({ pdf_path: pdfPath }).eq('id', inspectionId);
  }

  // ---- Email ----
  const smtpHost = Deno.env.get('SMTP_HOST');
  const smtpUser = Deno.env.get('SMTP_USER');
  const smtpPass = Deno.env.get('SMTP_PASS');
  if (!smtpHost || !smtpUser || !smtpPass) {
    return fail('email', 'SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS secrets)');
  }

  const toEmail = body.override_email || insp.client?.email;
  if (!toEmail) return fail('email', 'Client has no email address');

  const v = insp.vehicle ?? {};
  const vehicleTitle = [v.year, v.make, v.model].filter(Boolean).join(' ');
  const firstName = (insp.client?.full_name ?? '').split(' ')[0] || 'there';
  const recommendation = insp.recommendation ?? 'negotiate';
  const port = Number(Deno.env.get('SMTP_PORT') ?? '465');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: port === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const scoreLine = insp.overall_score != null ? `Overall condition score: ${insp.overall_score}/10` : '';
  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #171D19;">
    <h2 style="color: #7F1D1D; border-bottom: 3px solid #DC2626; padding-bottom: 8px;">${companyName}</h2>
    <p>Hi ${firstName},</p>
    <p>Thanks for bringing your <strong>${vehicleTitle}</strong> in on ${dateStr}.
       The full inspection report is attached as a PDF.</p>
    <div style="background: #F7F8F7; border: 1px solid #E6E9E6; border-radius: 12px; padding: 16px; margin: 16px 0;">
      <div style="font-weight: bold;">${scoreLine}</div>
      <div style="font-weight: bold; margin-top: 6px;">${REC_SENTENCE[recommendation]}</div>
    </div>
    <p>Questions? Just reply to this email.</p>
    <p style="color: #5C665F;">${insp.inspector?.full_name ?? ''}<br/>${companyName}</p>
  </div>`;

  const plateOrId = v.registration_plate ?? inspectionId.slice(0, 8);
  try {
    await transporter.sendMail({
      from: `"${Deno.env.get('SMTP_FROM_NAME') ?? companyName}" <${Deno.env.get('SMTP_FROM_ADDRESS') ?? smtpUser}>`,
      to: toEmail,
      subject: `Vehicle Inspection Report — ${vehicleTitle} (${plateOrId})`,
      text: `Hi ${firstName},\n\nThanks for bringing your ${vehicleTitle} in on ${dateStr}. ${scoreLine}. ${REC_SENTENCE[recommendation]}\n\nThe full inspection report is attached as a PDF.\n\n${insp.inspector?.full_name ?? ''}\n${companyName}`,
      html,
      attachments: [
        {
          filename: `Inspection-Report-${plateOrId}-${dateStr.replaceAll(' ', '-')}.pdf`,
          content: pdfBytes,
          contentType: 'application/pdf',
        },
      ],
    });
  } catch (e) {
    return fail('email', `Email failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  await supabase.from('inspections').update({ email_sent_at: new Date().toISOString() }).eq('id', inspectionId);

  return new Response(JSON.stringify({ ok: true, pdf_path: pdfPath }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

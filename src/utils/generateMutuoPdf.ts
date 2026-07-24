import jsPDF from "jspdf";
import { LoanApplication, AppSettings } from "../types";
import { DEFAULT_INSTITUTIONAL_DATA } from "../lib/defaultSettings";
import { numberToWordsSpanish } from "./numberToWords";

export function generateMutuoPdf(app: LoanApplication, settings: AppSettings): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const inst = settings?.institutionalData || DEFAULT_INSTITUTIONAL_DATA;

  // Personal data
  const firstName = app.personalData?.firstName || "XX";
  const lastName = app.personalData?.lastName || "XX";
  const fullName = `${firstName} ${lastName}`.toUpperCase();
  const dni = app.personalData?.dni || "11111111";
  const address = app.personalData?.address || "calle XXX 1111";
  const neighborhood = app.personalData?.neighborhood || "Tigre";
  const province = "Bs. As.";
  const fullAddress = `${address}, de la Localidad de ${neighborhood}, Provincia de ${province}`;

  // Loan details
  const requestedAmount = app.loanDetails?.requestedAmount || 0;
  const installmentsCount = app.loanDetails?.installmentsCount || 1;
  const paymentFrequency = app.loanDetails?.paymentFrequency || "Monthly";

  const creditType = app.loanDetails?.creditType;
  const selectedProduct = settings?.loanProducts?.find(
    p => p.name.trim().toLowerCase() === creditType?.trim().toLowerCase()
  );
  const rawRate = selectedProduct?.interestRate ?? 48;
  const annualRatePercent = rawRate <= 2 ? rawRate * 1200 : rawRate;
  const baseMonthlyRate = (annualRatePercent / 100) / 12;
  const periodicRate = paymentFrequency === 'Weekly' ? baseMonthlyRate / 4 : baseMonthlyRate;

  // Calculate installment amount and total amount
  let installmentAmount = 0;
  let totalAmountToReturn = 0;

  if (app.paymentSchedule && app.paymentSchedule.installments.length > 0) {
    installmentAmount = app.paymentSchedule.installments[0].amount;
    totalAmountToReturn = app.paymentSchedule.totalAmount;
  } else {
    if (periodicRate > 0) {
      installmentAmount = (requestedAmount * periodicRate * Math.pow(1 + periodicRate, installmentsCount)) / 
                          (Math.pow(1 + periodicRate, installmentsCount) - 1);
    } else {
      installmentAmount = requestedAmount / installmentsCount;
    }
    installmentAmount = Math.round(installmentAmount);
    totalAmountToReturn = Math.round(installmentAmount * installmentsCount);
  }

  // Dates
  const now = app.approvedAt ? new Date(app.approvedAt) : new Date();
  
  // Calculate first and last due dates from payment schedule or default logic
  let firstDueDateStr = "";
  let lastDueDateStr = "";

  if (app.paymentSchedule && app.paymentSchedule.installments.length > 0) {
    const firstDate = new Date(app.paymentSchedule.installments[0].dueDate);
    const lastDate = new Date(app.paymentSchedule.installments[app.paymentSchedule.installments.length - 1].dueDate);
    firstDueDateStr = formatDateShort(firstDate);
    lastDueDateStr = formatDateShort(lastDate);
  } else {
    const firstDate = new Date(now);
    firstDate.setMonth(firstDate.getMonth() + 1);
    const lastDate = new Date(now);
    lastDate.setMonth(lastDate.getMonth() + installmentsCount);
    firstDueDateStr = formatDateShort(firstDate);
    lastDueDateStr = formatDateShort(lastDate);
  }

  // Objective / Justification
  const justification = app.loanDetails?.justification || "desarrollo de su actividad productiva o comercial";

  // Formatted amounts
  const amountText = numberToWordsSpanish(requestedAmount);
  const amountFormatted = requestedAmount.toLocaleString("es-AR");
  const installmentAmountFormatted = Math.round(installmentAmount).toLocaleString("es-AR");
  const totalAmountFormatted = Math.round(totalAmountToReturn).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Term in months
  const termMonths = paymentFrequency === "Weekly" ? Math.ceil(installmentsCount / 4) : installmentsCount;

  // Short org name
  const orgShortName = inst.orgName.toUpperCase().includes("MUJERES 2000") ? "MUJERES 2000" : inst.orgName;

  // Date in Spanish text for signature
  const dayNum = now.getDate();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const monthName = monthNames[now.getMonth()];
  const yearNum = now.getFullYear();

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  let currentY = 20;

  // Helper to add footer
  const addFooter = () => {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 40, 120); // Purple tint
      const footerText = `${inst.website} - ${inst.phone}`;
      doc.text(footerText, margin, pageHeight - 12);
    }
  };

  // Helper for page overflow check
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
    }
  };

  // Render Header Logo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(80, 20, 100);
  doc.text("MUJERES", pageWidth - margin - 32, currentY, { align: "right" });
  doc.setTextColor(230, 140, 30);
  doc.text("2000", pageWidth - margin, currentY, { align: "right" });

  currentY += 15;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("Contrato Mutuo", pageWidth / 2, currentY, { align: "center" });
  currentY += 6;
  doc.setFontSize(11);
  doc.text(`${inst.orgName} y la emprendedora`, pageWidth / 2, currentY, { align: "center" });
  currentY += 12;

  // Helper to draw text paragraph with highlighted bold clauses
  const renderParagraph = (text: string, spaceAfter = 5) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);

    const lines = doc.splitTextToSize(text, contentWidth);
    const paragraphHeight = lines.length * 4.8;

    checkPageBreak(paragraphHeight + spaceAfter);

    doc.text(lines, margin, currentY, { align: "justify", maxWidth: contentWidth });
    currentY += paragraphHeight + spaceAfter;
  };

  // Header paragraph
  const headerPara = `Entre la ${inst.orgName} con domicilio legal en la ${inst.legalAddress} representada en este acto por ${inst.repName} DNI. No ${inst.repDni} en su carácter de ${inst.repRole}, en adelante ${orgShortName}, por una parte y por la otra, ${fullName} DNI ${dni} con domicilio real y legal en ${fullAddress}, en adelante LA EMPRENDEDORA, convienen en celebrar el presente CONTRATO que se regirá por las siguientes cláusulas:`;
  renderParagraph(headerPara, 6);

  // PRIMERA
  const primeraPara = `PRIMERA: ${orgShortName} otorga y LA EMPRENDEDORA acepta un PRÉSTAMO que será destinado para ${justification} que deberá invertir en el lapso de ${termMonths} meses corridos a partir de la fecha de la efectiva recepción del préstamo de acuerdo al medio estipulado por las partes.-`;
  renderParagraph(primeraPara, 6);

  // SEGUNDA
  const segundaPara = `SEGUNDA: El monto del préstamo asciende a la suma de ${amountText} ($${amountFormatted}) siendo el mismo reintegrable en ${installmentsCount} cuotas de ($${installmentAmountFormatted}) que corresponden a la devolución del monto del préstamo más un ${annualRatePercent}% por ciento anual en concepto de tasa de interés. El monto total a devolver es de $${totalAmountFormatted}`;
  renderParagraph(segundaPara, 6);

  // TERCERA
  const terceraPara = `TERCERA: Los pagos de las cuotas deberán efectuarse sin necesidad de aviso previo o requerimiento de ninguna naturaleza, venciendo la primera de ellas el ${firstDueDateStr} y la última el ${lastDueDateStr} en el domicilio de la sede del presente barrio o donde ${orgShortName} indique por escrito en el futuro a LA EMPRENDEDORA.`;
  renderParagraph(terceraPara, 6);

  // CUARTA
  const cuartaPara = `CUARTA: Las partes acuerdan el cumplimiento de las siguientes obligaciones:\n1. LA EMPRENDEDORA deberá:\na) Aplicar el monto recibido en su totalidad a la ejecución del proyecto.\nb) Efectuar el pago de las cuotas en tiempo y forma.\nc) Asistir a las capacitaciones y reuniones grupales.\n2. ${orgShortName} deberá:\na) Asesorar y asistir técnicamente a LA EMPRENDEDORA.\nb) Facilitar los medios para que LA EMPRENDEDORA cumpla con los compromisos asumidos en este convenio, en cuanto a lugares y días de pagos, información del estado de su crédito o avisos de vencimientos. El incumplimiento de lo establecido en las cláusulas precedentes dará derecho a ${orgShortName} a rescindir el contrato y a reclamar el saldo adeudado.`;
  renderParagraph(cuartaPara, 6);

  // QUINTA
  const quintaPara = `QUINTA: De conformidad a lo establecido en la cláusula segunda, LA EMPRENDEDORA no podrá variar el destino del préstamo, salvo que contare con aprobación previa de ${orgShortName} bajo apercibimiento de producirse la rescisión del Contrato. En tal sentido, LA EMPRENDEDORA se obliga a presentar a ${orgShortName} la documentación que demuestre la aplicación de los recursos del préstamo.`;
  renderParagraph(quintaPara, 6);

  // SEXTA
  const sextaPara = `SEXTA: ${orgShortName} se reserva el derecho de realizar en el local y/o vivienda donde funcione el emprendimiento de LA EMPRENDEDORA, todas las inspecciones y auditorías que considere necesarias para comprobar el destino de los fondos y la marcha del mismo.`;
  renderParagraph(sextaPara, 6);

  // SÉPTIMA
  const septimaPara = `SÉPTIMA: LA EMPRENDEDORA presta conformidad para que ${orgShortName} pueda hacer uso de su imagen o la del emprendimiento, con fines institucionales. La autorización comprende el uso de la imagen en campañas, medios gráficos y/o televisivos, página de internet y redes sociales y toda otra exhibición con fines institucionales lícitos.`;
  renderParagraph(septimaPara, 6);

  // OCTAVA
  const octavaPara = `OCTAVA: A todos los efectos legales LA EMPRENDEDORA constituye domicilio legal en el indicado en el encabezamiento del presente. En el citado domicilio se tendrán por válidas cuantas notificaciones ${orgShortName} considere.`;
  renderParagraph(octavaPara, 6);

  // NOVENA
  const novenaPara = `NOVENA: El presente contrato de préstamo sirve de suficiente recibo por parte de LA EMPRENDEDORA de los montos consignados en la CLÁUSULA SEGUNDA, quien formaliza por la presente legal carta de adeudo, importes que se obliga a restituir en las condiciones que se instrumentan en el presente contrato de crédito.`;
  renderParagraph(novenaPara, 8);

  // Closing date line
  const closingLine = `En prueba de conformidad y previa lectura, se firman dos ejemplares de un mismo tenor y a un solo efecto, a los ${dayNum} días del mes de ${monthName} del año ${yearNum}, en la localidad de ${inst.signatureLocation}.`;
  renderParagraph(closingLine, 15);

  // Signatures block
  checkPageBreak(40);
  currentY += 10;

  const leftSignX = margin + 10;
  const rightSignX = pageWidth - margin - 60;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("............................................", leftSignX, currentY);
  doc.text("............................................", rightSignX, currentY);

  currentY += 5;
  doc.setFont("helvetica", "bold");
  doc.text(fullName, leftSignX, currentY);
  doc.text(inst.repName, rightSignX, currentY);

  currentY += 4;
  doc.setFont("helvetica", "normal");
  doc.text("Emprendedora", leftSignX, currentY);
  doc.text(`${inst.repRole} ${inst.orgName}`, rightSignX, currentY);

  // Apply footer across pages
  addFooter();

  return doc;
}

function formatDateShort(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

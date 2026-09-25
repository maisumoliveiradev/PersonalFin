import { formatMoney, formatMonthLabel, type Month, monthRange } from '@personalfin/domain';
import PDFDocument from 'pdfkit';

import type { DataAccess } from '../../database/data-access.ts';
import { getMonthlyDashboard } from '../dashboard/get-dashboard.ts';
import { collectTransactions } from '../exports/transaction-export.ts';
import type { FinancialTransaction } from '../transactions/transaction.ts';

const MARGIN = 48;
const COLUMNS = [
  { title: 'Data', width: 62 },
  { title: 'Descrição', width: 190 },
  { title: 'Categoria', width: 110 },
  { title: 'Situação', width: 62 },
  { title: 'Valor', width: 75 },
] as const;

function money(amountMinor: number): string {
  return formatMoney({ amountMinor, currency: 'BRL' }, 'pt-BR');
}

function displayDate(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

function statusText(transaction: FinancialTransaction): string {
  const settled =
    transaction.cardPurchase === null
      ? transaction.status === 'paid'
      : transaction.cardPurchase.invoiceSettled;
  if (!settled) {
    return 'Pendente';
  }
  return transaction.type === 'income' ? 'Recebido' : 'Pago';
}

function toBuffer(document: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    document.end();
  });
}

export async function buildMonthlyReport(
  data: DataAccess,
  input: {
    financialSpaceId: string;
    spaceName: string;
    month: Month;
    generatedAt: Date;
    compress?: boolean;
  },
): Promise<Buffer> {
  const [dashboard, transactions] = await Promise.all([
    getMonthlyDashboard(data, input.financialSpaceId, input.month),
    collectTransactions(data, {
      financialSpaceId: input.financialSpaceId,
      range: monthRange(input.month),
    }),
  ]);
  const document = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    compress: input.compress ?? true,
    info: { Title: `PersonalFin — ${input.spaceName} — ${input.month}`, Creator: 'PersonalFin' },
  });
  const monthLabel = formatMonthLabel(input.month, 'pt-BR');

  document.font('Helvetica-Bold').fontSize(18).text('Relatório mensal');
  document
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#4B5563')
    .text(`${input.spaceName} · ${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)}`)
    .text(`Gerado em ${input.generatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`)
    .moveDown();

  const metric = (label: string, amountMinor: number) => {
    document.fillColor('#111827').font('Helvetica').fontSize(11).text(label, { continued: true });
    document.font('Helvetica-Bold').text(`  ${money(amountMinor)}`);
  };
  document.font('Helvetica-Bold').fontSize(13).fillColor('#111827').text('Resumo do mês');
  document.moveDown(0.3);
  metric('Receitas realizadas:', dashboard.realizedIncome);
  metric('Despesas realizadas:', dashboard.realizedExpenses);
  metric('Resultado realizado:', dashboard.realizedNet);
  metric('Receitas previstas (pendentes):', dashboard.forecastIncome);
  metric('Despesas previstas (pendentes):', dashboard.forecastExpenses);
  if (dashboard.projection !== null) {
    metric('Saldo projetado para o fim do mês:', dashboard.projection.amountMinor);
  }
  if (dashboard.observedBalance !== null) {
    metric(
      `Saldo observado em ${displayDate(dashboard.observedBalance.observedOn)}:`,
      dashboard.observedBalance.amountMinor,
    );
  }
  document
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#4B5563')
    .text('Valores calculados com as mesmas definições usadas no aplicativo.')
    .moveDown();

  document.font('Helvetica-Bold').fontSize(13).fillColor('#111827').text('Despesas por categoria');
  document.moveDown(0.3);
  if (dashboard.realizedExpensesByCategory.length === 0) {
    document.font('Helvetica').fontSize(11).text('Nenhuma despesa realizada no mês.');
  }
  for (const category of dashboard.realizedExpensesByCategory) {
    metric(`${category.name}:`, category.amountMinor);
  }
  document.moveDown();

  document.font('Helvetica-Bold').fontSize(13).fillColor('#111827').text('Lançamentos');
  document.moveDown(0.3);
  const drawRow = (cells: readonly string[], bold: boolean) => {
    if (document.y > document.page.height - MARGIN - 20) {
      document.addPage();
    }
    const y = document.y;
    let x = MARGIN;
    document
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(9)
      .fillColor('#111827');
    COLUMNS.forEach((column, index) => {
      document.text(cells[index] ?? '', x, y, {
        width: column.width - 6,
        align: index === COLUMNS.length - 1 ? 'right' : 'left',
        lineBreak: false,
        ellipsis: true,
      });
      x += column.width;
    });
    document.x = MARGIN;
    document.y = y + 14;
  };
  drawRow(
    COLUMNS.map((column) => column.title),
    true,
  );
  if (transactions.length === 0) {
    document.font('Helvetica').fontSize(11).text('Nenhum lançamento no mês.', MARGIN);
  }
  for (const transaction of transactions) {
    const signed =
      transaction.type === 'income' ? transaction.amountMinor : -transaction.amountMinor;
    drawRow(
      [
        displayDate(transaction.financialDate),
        transaction.description,
        transaction.subcategory === null
          ? transaction.category.name
          : `${transaction.category.name} › ${transaction.subcategory.name}`,
        statusText(transaction),
        money(signed),
      ],
      false,
    );
  }
  return toBuffer(document);
}

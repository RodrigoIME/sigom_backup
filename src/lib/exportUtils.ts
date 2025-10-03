import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Solicitacao {
  id: number;
  objeto: string;
  status: string;
  data_solicitacao: string;
  classificacao_urgencia: string | null;
  organizacoes?: {
    'Organização Militar': string;
    'Órgão Setorial Responsável': string;
  };
}

const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
  };
  return statusMap[status] || status;
};

export const exportToExcel = (solicitacoes: Solicitacao[], filename: string = 'solicitacoes') => {
  // Formatar dados para Excel
  const formattedData = solicitacoes.map(sol => ({
    'ID': sol.id,
    'Objeto': sol.objeto,
    'Status': formatStatus(sol.status),
    'Urgência': sol.classificacao_urgencia || 'Não especificada',
    'Organização': sol.organizacoes?.['Organização Militar'] || 'N/A',
    'Órgão Setorial': sol.organizacoes?.['Órgão Setorial Responsável'] || 'N/A',
    'Data Solicitação': format(new Date(sol.data_solicitacao), 'dd/MM/yyyy', { locale: ptBR }),
  }));

  // Criar workbook e worksheet
  const ws = XLSX.utils.json_to_sheet(formattedData);
  
  // Ajustar largura das colunas
  const columnWidths = [
    { wch: 8 },  // ID
    { wch: 40 }, // Objeto
    { wch: 15 }, // Status
    { wch: 15 }, // Urgência
    { wch: 35 }, // Organização
    { wch: 25 }, // Órgão Setorial
    { wch: 15 }, // Data
  ];
  ws['!cols'] = columnWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Solicitações');
  
  // Gerar arquivo
  XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

export const exportToPDF = (solicitacoes: Solicitacao[], filename: string = 'solicitacoes') => {
  const doc = new jsPDF('l', 'mm', 'a4'); // landscape, mm, A4
  
  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Solicitações de Vistoria', 14, 20);
  
  // Subtítulo com data
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
    14,
    28
  );
  
  // Preparar dados para tabela
  const tableData = solicitacoes.map(sol => [
    sol.id.toString(),
    sol.objeto.substring(0, 40) + (sol.objeto.length > 40 ? '...' : ''),
    formatStatus(sol.status),
    sol.classificacao_urgencia || 'N/A',
    sol.organizacoes?.['Organização Militar']?.substring(0, 30) || 'N/A',
    sol.organizacoes?.['Órgão Setorial Responsável'] || 'N/A',
    format(new Date(sol.data_solicitacao), 'dd/MM/yyyy', { locale: ptBR }),
  ]);

  // Gerar tabela
  autoTable(doc, {
    startY: 35,
    head: [['ID', 'Objeto', 'Status', 'Urgência', 'Organização', 'Órgão Setorial', 'Data']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246], // blue-500
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 50 },
      5: { cellWidth: 40 },
      6: { cellWidth: 22, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() - 30,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Salvar
  doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

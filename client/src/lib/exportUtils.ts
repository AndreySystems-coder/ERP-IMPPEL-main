export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert("Nenhum dado para exportar");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        if (typeof value === "string" && value.includes(",")) {
          return `"${value}"`;
        }
        return value || "";
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
}

export function exportToPDF(data: any[], filename: string) {
  // Simple HTML-based PDF export
  const html = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #333; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          tr:hover { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>${filename}</h1>
        <p>Data: ${new Date().toLocaleDateString("pt-BR")}</p>
        <table>
          <thead>
            <tr>
              ${Object.keys(data[0])
                .map((key) => `<th>${key}</th>`)
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (row) =>
                  `<tr>
              ${Object.keys(data[0])
                .map((key) => `<td>${row[key] || ""}</td>`)
                .join("")}
            </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open("", "", "width=800,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
}

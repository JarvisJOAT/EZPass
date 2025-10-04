const statusEl = document.getElementById('status');
const fetchButton = document.getElementById('run-fetch');
const plateSummaryBody = document.querySelector('#plate-summary tbody');
const transponderSummaryBody = document.querySelector('#transponder-summary tbody');
const transactionsBody = document.querySelector('#transactions tbody');

const formatCurrency = (amountCents) => {
  return (amountCents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
};

const updateStatus = async () => {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    statusEl.textContent = `Status: ${data.running ? 'running' : 'idle'} (cron: ${data.scheduleCron})`;
    fetchButton.disabled = data.running;
  } catch (error) {
    console.error('Failed to load status', error);
    statusEl.textContent = 'Status: unavailable';
  }
};

const loadSummaries = async () => {
  const [plateResponse, transponderResponse] = await Promise.all([
    fetch('/api/summary/plate'),
    fetch('/api/summary/transponder'),
  ]);

  const plateData = await plateResponse.json();
  const transponderData = await transponderResponse.json();

  plateSummaryBody.innerHTML = '';
  plateData.summary.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.plate}</td>
      <td>${formatCurrency(row.amountCents)}</td>
    `;
    plateSummaryBody.appendChild(tr);
  });

  transponderSummaryBody.innerHTML = '';
  transponderData.summary.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.transponder}</td>
      <td>${formatCurrency(row.amountCents)}</td>
    `;
    transponderSummaryBody.appendChild(tr);
  });
};

const loadTransactions = async () => {
  const response = await fetch('/api/transactions');
  const data = await response.json();

  transactionsBody.innerHTML = '';

  data.transactions.forEach((tx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${tx.transactionDate}</td>
      <td>${tx.provider}</td>
      <td>${tx.plate ?? '-'}</td>
      <td>${tx.transponder ?? '-'}</td>
      <td>${tx.description ?? '-'}</td>
      <td>${formatCurrency(tx.amountCents)}</td>
      <td>${tx.sourceFileUrl ? `<a href="${tx.sourceFileUrl}" target="_blank" rel="noopener">Download</a>` : '-'}</td>
    `;
    transactionsBody.appendChild(tr);
  });
};

fetchButton.addEventListener('click', async () => {
  fetchButton.disabled = true;
  statusEl.textContent = 'Status: running (manual)';

  try {
    const response = await fetch('/api/run', { method: 'POST' });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message ?? 'Failed to start fetch');
    }

    await pollUntilIdle();
    await loadAll();
  } catch (error) {
    console.error(error);
    alert(`Failed to start fetch: ${error.message}`);
  } finally {
    await updateStatus();
  }
});

const pollUntilIdle = async () => {
  // Poll every 5 seconds until status indicates idle
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const response = await fetch('/api/status');
    const { running } = await response.json();
    if (!running) {
      break;
    }
  }
};

const loadAll = async () => {
  await Promise.all([updateStatus(), loadSummaries(), loadTransactions()]);
};

loadAll();
setInterval(updateStatus, 15000);

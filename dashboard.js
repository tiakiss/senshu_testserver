/**
 * 攻撃者IP調査ダッシュボード
 */
document.addEventListener('DOMContentLoaded', function() {
  // アプリケーションの状態
  const state = {
    filters: {
      servers: ['all'],
      localIp: 'all',
      remoteIp: 'all',
      ports: ['all']
    },
    pagination: {
      page: 1,
      limit: 10,
      total: 0
    },
    data: {
      connections: [],
      filterOptions: {
        servers: [],
        localIps: [],
        remoteIps: [],
        ports: []
      },
      stats: {
        remoteIp: [],
        server: [],
        port: []
      }
    },
    charts: {
      remoteIp: null,
      server: null,
      port: null
    }
  };

  // 要素の参照
  const elements = {
    dashboard: document.getElementById('dashboard'),
    loading: document.getElementById('loading'),
    serverFilter: document.getElementById('server-filter'),
    localIpFilter: document.getElementById('local-ip-filter'),
    remoteIpFilter: document.getElementById('remote-ip-filter'),
    portFilter: document.getElementById('port-filter'),
    connectionCount: document.getElementById('connection-count'),
    uniqueIpCount: document.getElementById('unique-ip-count'),
    topAttacker: document.getElementById('top-attacker'),
    remoteIpChart: document.getElementById('remote-ip-chart'),
    serverChart: document.getElementById('server-chart'),
    portChart: document.getElementById('port-chart'),
    connectionTableBody: document.getElementById('connection-table-body'),
    paginationInfo: document.getElementById('pagination-info'),
    prevPageBtn: document.getElementById('prev-page'),
    nextPageBtn: document.getElementById('next-page')
  };

  // APIのベースURL
  const API_BASE_URL = '/api/v1';

  // アプリケーションの初期化
  async function init() {
    try {
      // フィルターオプションを取得
      await fetchFilterOptions();
      
      // フィルターのUIを初期化
      initializeFilters();
      
      // データの取得と画面の更新
      await refreshDashboard();
      
      // ローディング表示を非表示にし、ダッシュボードを表示
      elements.loading.classList.add('hidden');
      elements.dashboard.classList.remove('hidden');
    } catch (error) {
      console.error('初期化エラー:', error);
      elements.loading.textContent = 'データの読み込み中にエラーが発生しました。';
    }
  }

  // フィルターオプションを取得
  async function fetchFilterOptions() {
    const response = await axios.get(`${API_BASE_URL}/connections/filters`);
    state.data.filterOptions = response.data;
    return response.data;
  }

  // フィルターのUIを初期化
  function initializeFilters() {
    // サーバーフィルター
    initializeMultiSelectFilter(
      elements.serverFilter,
      state.data.filterOptions.servers,
      'server',
      state.filters.servers,
      (selected) => {
        state.filters.servers = selected;
        state.pagination.page = 1;
        refreshDashboard();
      }
    );
    
    // ローカルIPフィルター
    initializeSelectFilter(
      elements.localIpFilter,
      state.data.filterOptions.localIps,
      state.filters.localIp,
      (selected) => {
        state.filters.localIp = selected;
        state.pagination.page = 1;
        refreshDashboard();
      }
    );
    
    // リモートIPフィルター
    initializeSelectFilter(
      elements.remoteIpFilter,
      state.data.filterOptions.remoteIps,
      state.filters.remoteIp,
      (selected) => {
        state.filters.remoteIp = selected;
        state.pagination.page = 1;
        refreshDashboard();
      }
    );
    
    // ポートフィルター
    initializeMultiSelectFilter(
      elements.portFilter,
      state.data.filterOptions.ports,
      'port',
      state.filters.ports,
      (selected) => {
        state.filters.ports = selected;
        state.pagination.page = 1;
        refreshDashboard();
      }
    );
  }

  // 単一選択フィルターの初期化
  function initializeSelectFilter(element, options, currentValue, onChange) {
    // 既存のオプションをクリア
    element.innerHTML = '';
    
    // すべてのオプション
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'すべて';
    element.appendChild(allOption);
    
    // その他のオプション
    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.textContent = option;
      element.appendChild(optionElement);
    });
    
    // 現在の値を設定
    element.value = currentValue;
    
    // 変更イベントを設定
    element.addEventListener('change', function() {
      onChange(this.value);
    });
  }

  // 複数選択フィルターの初期化
  function initializeMultiSelectFilter(element, options, optionPrefix, selectedValues, onChange) {
    // 既存のオプションをクリア
    element.innerHTML = '';
    
    // すべてのオプション
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'すべて';
    element.appendChild(allOption);
    
    // その他のオプション
    options.forEach((option, index) => {
      const optionElement = document.createElement('option');
      optionElement.value = `${optionPrefix}-${index}`;
      optionElement.textContent = option;
      optionElement.dataset.actualValue = option;
      element.appendChild(optionElement);
    });
    
    // 複数選択の設定
    $(element).select2({
      placeholder: 'すべて',
      allowClear: true,
      multiple: true
    });
    
    // 現在の値を設定
    if (selectedValues.includes('all')) {
      $(element).val(['all']).trigger('change');
    } else {
      const selectedOptions = Array.from(element.options)
        .filter(option => selectedValues.includes(option.dataset.actualValue))
        .map(option => option.value);
      
      $(element).val(selectedOptions).trigger('change');
    }
    
    // 変更イベントを設定
    $(element).on('change', function() {
      const selectedOptions = $(this).val() || [];
      
      if (selectedOptions.includes('all')) {
        // 「すべて」が選択されている場合、他のオプションをクリア
        $(this).val(['all']).trigger('change');
        onChange(['all']);
      } else if (selectedOptions.length === 0) {
        // 何も選択されていない場合、「すべて」を選択
        $(this).val(['all']).trigger('change');
        onChange(['all']);
      } else {
        // 実際の値に変換
        const actualValues = Array.from(element.options)
          .filter(option => selectedOptions.includes(option.value) && option.value !== 'all')
          .map(option => option.dataset.actualValue);
        
        onChange(actualValues);
      }
    });
  }

  // ダッシュボードを更新
  async function refreshDashboard() {
    try {
      // 接続データを取得
      await fetchConnections();
      
      // 統計データを取得
      await fetchStats();
      
      // UIを更新
      updateUI();
    } catch (error) {
      console.error('ダッシュボード更新エラー:', error);
    }
  }

  // 接続データを取得
  async function fetchConnections() {
    // APIパラメータの構築
    const params = {
      page: state.pagination.page,
      limit: state.pagination.limit
    };
    
    // フィルターの適用
    if (!state.filters.servers.includes('all')) {
      params.servers = state.filters.servers.join(',');
    }
    
    if (state.filters.localIp !== 'all') {
      params.localIp = state.filters.localIp;
    }
    
    if (state.filters.remoteIp !== 'all') {
      params.remoteIp = state.filters.remoteIp;
    }
    
    if (!state.filters.ports.includes('all')) {
      params.ports = state.filters.ports.join(',');
    }
    
    // APIリクエスト
    const response = await axios.get(`${API_BASE_URL}/connections`, { params });
    
    // 状態を更新
    state.data.connections = response.data.connections;
    state.pagination.total = response.data.total;
    
    return response.data;
  }

  // 統計データを取得
  async function fetchStats() {
    // APIパラメータの構築
    const params = {};
    
    // フィルターの適用
    if (!state.filters.servers.includes('all')) {
      params.servers = state.filters.servers.join(',');
    }
    
    if (state.filters.localIp !== 'all') {
      params.localIp = state.filters.localIp;
    }
    
    if (state.filters.remoteIp !== 'all') {
      params.remoteIp = state.filters.remoteIp;
    }
    
    if (!state.filters.ports.includes('all')) {
      params.ports = state.filters.ports.join(',');
    }
    
    // APIリクエスト
    const response = await axios.get(`${API_BASE_URL}/connections/stats`, { params });
    
    // 状態を更新
    state.data.stats = response.data;
    
    return response.data;
  }

  // UIを更新
  function updateUI() {
    // 接続テーブルを更新
    updateConnectionTable();
    
    // ページネーション情報を更新
    updatePagination();
    
    // 統計情報を更新
    updateStats();
    
    // チャートを更新
    updateCharts();
  }

  // 接続テーブルを更新
  function updateConnectionTable() {
    // テーブルをクリア
    elements.connectionTableBody.innerHTML = '';
    
    // データがない場合
    if (state.data.connections.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.textContent = 'データがありません';
      cell.className = 'no-data';
      row.appendChild(cell);
      elements.connectionTableBody.appendChild(row);
      return;
    }
    
    // 各接続の行を作成
    state.data.connections.forEach(connection => {
      const row = document.createElement('tr');
      
      // タイムスタンプ
      const timestampCell = document.createElement('td');
      timestampCell.textContent = formatTimestamp(connection.timestamp);
      row.appendChild(timestampCell);
      
      // サーバー
      const serverCell = document.createElement('td');
      serverCell.textContent = connection.server;
      row.appendChild(serverCell);
      
      // ローカルIP
      const localIpCell = document.createElement('td');
      localIpCell.textContent = connection.localIp;
      row.appendChild(localIpCell);
      
      // ポート
      const portCell = document.createElement('td');
      portCell.textContent = connection.port;
      row.appendChild(portCell);
      
      // リモートIP
      const remoteIpCell = document.createElement('td');
      remoteIpCell.textContent = connection.remoteIp;
      row.appendChild(remoteIpCell);
      
      // ステータス
      const statusCell = document.createElement('td');
      statusCell.textContent = connection.status;
      statusCell.className = `status-${connection.status.toLowerCase()}`;
      row.appendChild(statusCell);
      
      // テーブルに行を追加
      elements.connectionTableBody.appendChild(row);
    });
  }

  // タイムスタンプのフォーマット
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP');
  }

  // ページネーション情報を更新
  function updatePagination() {
    // 開始と終了のインデックス
    const start = (state.pagination.page - 1) * state.pagination.limit + 1;
    const end = Math.min(start + state.pagination.limit - 1, state.pagination.total);
    
    // ページネーション情報テキスト
    elements.paginationInfo.textContent = `${start} - ${end} / ${state.pagination.total}`;
    
    // 前ページボタン
    elements.prevPageBtn.disabled = state.pagination.page <= 1;
    
    // 次ページボタン
    elements.nextPageBtn.disabled = end >= state.pagination.total;
    
    // ボタンのイベントリスナーを設定
    elements.prevPageBtn.onclick = () => {
      if (state.pagination.page > 1) {
        state.pagination.page--;
        refreshDashboard();
      }
    };
    
    elements.nextPageBtn.onclick = () => {
      if (end < state.pagination.total) {
        state.pagination.page++;
        refreshDashboard();
      }
    };
  }

  // 統計情報を更新
  function updateStats() {
    // 接続総数
    elements.connectionCount.textContent = state.pagination.total;
    
    // ユニークIP数
    const uniqueIps = new Set(state.data.stats.remoteIp.map(item => item.value));
    elements.uniqueIpCount.textContent = uniqueIps.size;
    
    // 最多攻撃元IP
    if (state.data.stats.remoteIp.length > 0) {
      const topAttacker = state.data.stats.remoteIp.reduce((max, current) => 
        current.count > max.count ? current : max
      );
      elements.topAttacker.textContent = `${topAttacker.value} (${topAttacker.count}回)`;
    } else {
      elements.topAttacker.textContent = '-';
    }
  }

  // チャートを更新
  function updateCharts() {
    // リモートIPチャート
    updateChart(
      'remoteIp',
      'リモートIP別接続数',
      state.data.stats.remoteIp.slice(0, 10)
    );
    
    // サーバーチャート
    updateChart(
      'server',
      'サーバー別接続数',
      state.data.stats.server
    );
    
    // ポートチャート
    updateChart(
      'port',
      'ポート別接続数',
      state.data.stats.port.slice(0, 10)
    );
  }

  // 特定のチャートを更新
  function updateChart(chartType, title, data) {
    // キャンバスのコンテキスト
    const ctx = elements[`${chartType}Chart`].getContext('2d');
    
    // データの準備
    const chartData = {
      labels: data.map(item => item.value),
      datasets: [{
        label: title,
        data: data.map(item => item.count),
        backgroundColor: data.map((_, i) => getChartColor(i)),
        borderColor: data.map((_, i) => getChartColor(i)),
        borderWidth: 1
      }]
    };
    
    // チャートのオプション
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${context.raw}回`;
            }
          }
        }
      }
    };
    
    // 既存のチャートを破棄
    if (state.charts[chartType]) {
      state.charts[chartType].destroy();
    }
    
    // 新しいチャートを作成
    state.charts[chartType] = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: options
    });
  }

  // チャートの色を取得
  function getChartColor(index) {
    const colors = [
      '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
      '#1abc9c', '#e67e22', '#34495e', '#d35400', '#c0392b'
    ];
    
    return colors[index % colors.length];
  }

  // アプリケーションを初期化
  init();
});

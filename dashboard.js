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
      const errorMessage = error.response ? 
        `エラー: ${error.response.status} - ${JSON.stringify(error.response.data)}` : 
        'データの読み込み中にエラーが発生しました。';
      
      elements.loading.innerHTML = `
        <p>${errorMessage}</p>
        <button onclick="location.reload()">再読み込み</button>
      `;
    }
  }

  // フィルターオプションを取得
  async function fetchFilterOptions() {
    try {
      console.log('フィルターオプション取得開始...');
      const response = await axios.get(`${API_BASE_URL}/connections/filters`);
      console.log('フィルターオプション取得成功:', response.data);
      state.data.filterOptions = response.data;
      return response.data;
    } catch (error) {
      console.error('フィルターオプション取得エラー:', error);
      if (error.response) {
        console.error('エラー詳細:', error.response.data);
      }
      throw error;
    }
  }

  // フィルターのUIを初期化
  function initializeFilters() {
    console.log('フィルター初期化中...');
    
    // サーバーフィルター
    initializeMultiSelectFilter(
      elements.serverFilter,
      state.data.filterOptions.servers || [],
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
      state.data.filterOptions.localIps || [],
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
      state.data.filterOptions.remoteIps || [],
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
      state.data.filterOptions.ports || [],
      'port',
      state.filters.ports,
      (selected) => {
        state.filters.ports = selected;
        state.pagination.page = 1;
        refreshDashboard();
      }
    );
    
    console.log('フィルター初期化完了');
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
    
    try {
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
    } catch (error) {
      console.error('Select2初期化エラー:', error);
      // フォールバック: 通常のセレクトボックスとして機能させる
      element.multiple = true;
      element.addEventListener('change', function() {
        const selectedOptions = Array.from(this.selectedOptions).map(option => option.value);
        const actualValues = selectedOptions.includes('all') ? 
          ['all'] : 
          Array.from(this.selectedOptions)
            .filter(option => option.value !== 'all')
            .map(option => option.dataset.actualValue);
        
        onChange(actualValues);
      });
    }
  }

  // ダッシュボードを更新
  async function refreshDashboard() {
    try {
      console.log('ダッシュボード更新開始...');
      
      // 接続データを取得
      await fetchConnections();
      
      // 統計データを取得
      await fetchStats();
      
      // UIを更新
      updateUI();
      
      console.log('ダッシュボード更新完了');
    } catch (error) {
      console.error('ダッシュボード更新エラー:', error);
      if (error.response) {
        console.error('エラー詳細:', error.response.data);
      }
    }
  }

  // 接続データを取得
  async function fetchConnections() {
    try {
      console.log('接続データ取得開始...');
      
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
      
      console.log('APIリクエストパラメータ:', params);
      
      // APIリクエスト
      const response = await axios.get(`${API_BASE_URL}/connections`, { params });
      
      console.log('接続データ取得成功:', response.data);
      
      // 状態を更新
      state.data.connections = response.data.connections || [];
      state.pagination.total = response.data.total || 0;
      
      return response.data;
    } catch (error) {
      console.error('接続データ取得エラー:', error);
      if (error.response) {
        console.error('エラー詳細:', error.response.data);
      }
      throw error;
    }
  }

  // 統計データを取得
  async function fetchStats() {
    try {
      console.log('統計データ取得開始...');
      
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
      
      console.log('APIリクエストパラメータ:', params);
      
      // APIリクエスト
      const response = await axios.get(`${API_BASE_URL}/connections/stats`, { params });
      
      console.log('統計データ取得成功:', response.data);
      
      // 状態を更新
      state.data.stats = response.data;

      // データがない場合の初期化
      if (!state.data.stats.remoteIp) state.data.stats.remoteIp = [];
      if (!state.data.stats.server) state.data.stats.server = [];
      if (!state.data.stats.port) state.data.stats.port = [];
      
      return response.data;
    } catch (error) {
      console.error('統計データ取得エラー:', error);
      if (error.response) {
        console.error('エラー詳細:', error.response.data);
      }
      throw error;
    }
  }

  // UIを更新
  function updateUI() {
    try {
      console.log('UI更新開始...');
      
      // 接続テーブルを更新
      updateConnectionTable();
      
      // ページネーション情報を更新
      updatePagination();
      
      // 統計情報を更新
      updateStats();
      
      // チャートを更新
      updateCharts();
      
      console.log('UI更新完了');
    } catch (error) {
      console.error('UI更新エラー:', error);
    }
  }

  // 接続テーブルを更新
  function updateConnectionTable() {
    try {
      // テーブルをクリア
      elements.connectionTableBody.innerHTML = '';
      
      // データがない場合
      if (!state.data.connections || state.data.connections.length === 0) {
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
        serverCell.textContent = connection.server || '';
        row.appendChild(serverCell);
        
        // ローカルIP
        const localIpCell = document.createElement('td');
        localIpCell.textContent = connection.localIp || '';
        row.appendChild(localIpCell);
        
        // ポート
        const portCell = document.createElement('td');
        portCell.textContent = connection.port || '';
        row.appendChild(portCell);
        
        // リモートIP
        const remoteIpCell = document.createElement('td');
        remoteIpCell.textContent = connection.remoteIp || '';
        row.appendChild(remoteIpCell);
        
        // ステータス
        const statusCell = document.createElement('td');
        statusCell.textContent = connection.status || '';
        if (connection.status) {
          statusCell.className = `status-${connection.status.toLowerCase()}`;
        }
        row.appendChild(statusCell);
        
        // テーブルに行を追加
        elements.connectionTableBody.appendChild(row);
      });
    } catch (error) {
      console.error('テーブル更新エラー:', error);
    }
  }

  // タイムスタンプのフォーマット
  function formatTimestamp(timestamp) {
    try {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString('ja-JP');
    } catch (error) {
      console.error('タイムスタンプフォーマットエラー:', error);
      return timestamp || '';
    }
  }

  // ページネーション情報を更新
  function updatePagination() {
    try {
      // 開始と終了のインデックス
      const start = state.pagination.total ? (state.pagination.page - 1) * state.pagination.limit + 1 : 0;
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
    } catch (error) {
      console.error('ページネーション更新エラー:', error);
    }
  }

  // 統計情報を更新
  function updateStats() {
    try {
      // 接続総数
      elements.connectionCount.textContent = state.pagination.total || 0;
      
      // ユニークIP数
      const uniqueIps = new Set(state.data.stats.remoteIp.map(item => item.value));
      elements.uniqueIpCount.textContent = uniqueIps.size || 0;
      
      // 最多攻撃元IP
      if (state.data.stats.remoteIp && state.data.stats.remoteIp.length > 0) {
        const topAttacker = state.data.stats.remoteIp.reduce((max, current) => 
          current.count > max.count ? current : max
        , state.data.stats.remoteIp[0]);
        
        elements.topAttacker.textContent = `${topAttacker.value} (${topAttacker.count}回)`;
      } else {
        elements.topAttacker.textContent = '-';
      }
    } catch (error) {
      console.error('統計情報更新エラー:', error);
    }
  }

  // チャートを更新
  function updateCharts() {
    try {
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
    } catch (error) {
      console.error('チャート更新エラー:', error);
    }
  }

  // 特定のチャートを更新
  function updateChart(chartType, title, data) {
    try {
      // データがない場合
      if (!data || data.length === 0) {
        // 既存のチャートを破棄
        if (state.charts[chartType]) {
          state.charts[chartType].destroy();
          state.charts[chartType] = null;
        }
        
        // キャンバスにメッセージを表示
        const ctx = elements[`${chartType}Chart`].getContext('2d');
        ctx.clearRect(0, 0, elements[`${chartType}Chart`].width, elements[`${chartType}Chart`].height);
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#7f8c8d';
        ctx.fillText('データがありません', elements[`${chartType}Chart`].width / 2, elements[`${chartType}Chart`].height / 2);
        
        return;
      }
      
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
    } catch (error) {
      console.error(`${chartType}チャート更新エラー:`, error);
    }
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
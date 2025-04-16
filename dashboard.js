/**
 * 攻撃者IP調査ダッシュボード - 軽量化バージョン
 */
document.addEventListener('DOMContentLoaded', function() {
  // アプリケーションの状態
  const state = {
    filters: {
      dateFrom: null,
      dateTo: null,
      servers: ['all'],
      localIp: 'all',
      remoteIp: 'all',
      ports: ['all']
    },
    pagination: {
      total: 0
    },
    data: {
      filterOptions: {
        servers: [],
        localIps: [],
        remoteIps: [],
        ports: []
      },
      stats: {
        remoteIp: [],
        server: [],
        port: [],
        remoteIpByServer: []
      }
    },
    charts: {
      remoteIp: null,
      server: null,
      port: null,
      remoteIpByServer: null
    }
  };

  // 要素の参照
  const elements = {
    dashboard: document.getElementById('dashboard'),
    loading: document.getElementById('loading'),
    dateFrom: document.getElementById('date-from'),
    dateTo: document.getElementById('date-to'),
    serverFilter: document.getElementById('server-filter'),
    localIpFilter: document.getElementById('local-ip-filter'),
    remoteIpFilter: document.getElementById('remote-ip-filter'),
    portFilter: document.getElementById('port-filter'),
    applyFiltersBtn: document.getElementById('apply-filters'),
    resetFiltersBtn: document.getElementById('reset-filters'),
    connectionCount: document.getElementById('connection-count'),
    uniqueIpCount: document.getElementById('unique-ip-count'),
    topAttacker: document.getElementById('top-attacker'),
    remoteIpChart: document.getElementById('remote-ip-chart'),
    serverChart: document.getElementById('server-chart'),
    portChart: document.getElementById('port-chart'),
    remoteIpByServerChart: document.getElementById('remote-ip-by-server-chart')
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
    
    // 日付フィルターの初期化
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    // 日付をYYYY-MM-DD形式に変換する関数
    function formatDateForInput(date) {
      return date.toISOString().split('T')[0];
    }
    
    // 初期日付を設定
    elements.dateFrom.value = formatDateForInput(oneMonthAgo);
    elements.dateTo.value = formatDateForInput(today);
    
    // 状態を更新
    state.filters.dateFrom = elements.dateFrom.value;
    state.filters.dateTo = elements.dateTo.value;
    
    // サーバーフィルター
    initializeMultiSelectFilter(
      elements.serverFilter,
      state.data.filterOptions.servers || [],
      'server',
      state.filters.servers,
      (selected) => {
        console.log('サーバーフィルター変更:', selected);
        state.filters.servers = selected;
      }
    );
    
    // ローカルIPフィルター
    initializeSelectFilter(
      elements.localIpFilter,
      state.data.filterOptions.localIps || [],
      state.filters.localIp,
      (selected) => {
        state.filters.localIp = selected;
      }
    );
    
    // リモートIPフィルター
    initializeSelectFilter(
      elements.remoteIpFilter,
      state.data.filterOptions.remoteIps || [],
      state.filters.remoteIp,
      (selected) => {
        state.filters.remoteIp = selected;
      }
    );
    
    // ポートフィルター
    initializeMultiSelectFilter(
      elements.portFilter,
      state.data.filterOptions.ports || [],
      'port',
      state.filters.ports,
      (selected) => {
        console.log('ポートフィルター変更:', selected);
        state.filters.ports = selected;
      }
    );
    
    // フィルター適用ボタンのイベントハンドラ
    elements.applyFiltersBtn.addEventListener('click', () => {
      console.log('フィルター適用ボタンがクリックされました');
      
      // 日付フィルターの値を更新
      state.filters.dateFrom = elements.dateFrom.value;
      state.filters.dateTo = elements.dateTo.value;
      
      // 現在の選択状態を確認して状態を更新
      // サーバーフィルター
      const serverSelectedValues = $(elements.serverFilter).val() || [];
      state.filters.servers = serverSelectedValues.includes('all') ? ['all'] : serverSelectedValues;
      console.log('適用するサーバーフィルター:', state.filters.servers);
      
      // ローカルIPフィルター
      state.filters.localIp = elements.localIpFilter.value;
      
      // リモートIPフィルター
      state.filters.remoteIp = elements.remoteIpFilter.value;
      
      // ポートフィルター
      const portSelectedValues = $(elements.portFilter).val() || [];
      state.filters.ports = portSelectedValues.includes('all') ? ['all'] : portSelectedValues;
      console.log('適用するポートフィルター:', state.filters.ports);
      
      // ダッシュボードを更新
      refreshDashboard();
    });
    
    // フィルターリセットボタンのイベントハンドラ
    elements.resetFiltersBtn.addEventListener('click', () => {
      // 日付フィルターをリセット
      elements.dateFrom.value = formatDateForInput(oneMonthAgo);
      elements.dateTo.value = formatDateForInput(today);
      state.filters.dateFrom = elements.dateFrom.value;
      state.filters.dateTo = elements.dateTo.value;
      
      // その他のフィルターをリセット
      state.filters.servers = ['all'];
      state.filters.localIp = 'all';
      state.filters.remoteIp = 'all';
      state.filters.ports = ['all'];
      
      // UIを更新
      $(elements.serverFilter).val(['all']).trigger('change.select2');
      $(elements.localIpFilter).val('all');
      $(elements.remoteIpFilter).val('all');
      $(elements.portFilter).val(['all']).trigger('change.select2');
      
      // ダッシュボードを更新
      refreshDashboard();
    });
    
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
    console.log(`${optionPrefix}フィルター初期化開始: 選択値=`, selectedValues);
    
    // 既存のオプションをクリア
    element.innerHTML = '';
    
    // すべてのオプション
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'すべて';
    element.appendChild(allOption);
    
    // その他のオプション
    options.forEach((option) => {
      const optionElement = document.createElement('option');
      optionElement.value = option; // 直接オプション値を使用
      optionElement.textContent = option;
      element.appendChild(optionElement);
    });
    
    try {
      // select2を初期化する前にイベントハンドラをクリア
      $(element).off('change');
      
      // 複数選択の設定
      $(element).select2({
        placeholder: 'すべて',
        allowClear: true,
        multiple: true
      });
      
      // イベントフラグ（再帰呼び出し防止用）
      let isUpdating = false;
      
      // 変更イベントを設定
      $(element).on('change', function() {
        // 既に更新中なら処理をスキップ
        if (isUpdating) return;
        
        isUpdating = true;
        
        // 選択された値を取得 (配列)
        const selectedOptions = $(this).val() || [];
        console.log(`${optionPrefix}フィルター変更イベント:`, selectedOptions);
        
        if (selectedOptions.includes('all')) {
          // 「すべて」が選択されている場合、他のオプションをクリア
          $(this).val(['all']).trigger('change.select2');
          onChange(['all']);
        } else if (selectedOptions.length === 0) {
          // 何も選択されていない場合、「すべて」を選択
          $(this).val(['all']).trigger('change.select2');
          onChange(['all']);
        } else {
          // 「すべて」以外が選択されている場合、実際の値をそのまま適用
          onChange(selectedOptions);
        }
        
        // フラグを戻す
        setTimeout(() => {
          isUpdating = false;
        }, 0);
      });
      
      // 現在の値を設定（イベント発火は表示更新のみ）
      if (selectedValues.includes('all')) {
        $(element).val(['all']).trigger('change.select2');
      } else {
        $(element).val(selectedValues).trigger('change.select2');
      }
      
      console.log(`${optionPrefix}フィルター初期化完了`);
    } catch (error) {
      console.error(`${optionPrefix}フィルター初期化エラー:`, error);
      // フォールバック: 通常のセレクトボックスとして機能させる
      element.multiple = true;
      element.addEventListener('change', function() {
        const selectedOptions = Array.from(this.selectedOptions).map(option => option.value);
        const actualValues = selectedOptions.includes('all') ? 
          ['all'] : 
          selectedOptions;
        
        onChange(actualValues);
      });
    }
  }

  // ダッシュボードを更新
  async function refreshDashboard() {
    try {
      console.log('ダッシュボード更新開始...');
      
      // 接続データの総数を取得 (テーブル表示しないが、統計情報のために必要)
      await fetchConnectionCount();
      
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

  // 接続数のみを取得する軽量な関数
  async function fetchConnectionCount() {
    try {
      console.log('接続数取得開始...');
      
      // APIパラメータの構築
      const params = {
        page: 1,
        limit: 1 // 最小限のデータだけを要求
      };
      
      // フィルターの適用
      applyFiltersToParams(params);
      
      console.log('APIリクエストパラメータ:', params);
      
      // APIリクエスト
      const response = await axios.get(`${API_BASE_URL}/connections`, { params });
      
      // 総数だけを保存
      state.pagination.total = response.data.total || 0;
      
      return response.data.total;
    } catch (error) {
      console.error('接続数取得エラー:', error);
      if (error.response) {
        console.error('エラー詳細:', error.response.data);
      }
      throw error;
    }
  }
  
  // APIパラメータにフィルターを適用する関数
  function applyFiltersToParams(params) {
    console.log('フィルター適用前のパラメータ:', { ...params });
    console.log('現在のフィルター状態:', { ...state.filters });
    
    // 日付フィルター
    if (state.filters.dateFrom) {
      params.dateFrom = state.filters.dateFrom;
    }
    
    if (state.filters.dateTo) {
      params.dateTo = state.filters.dateTo;
    }
    
    // サーバーフィルター
    if (state.filters.servers && state.filters.servers.length > 0 && !state.filters.servers.includes('all')) {
      params.servers = state.filters.servers.join(',');
    }
    
    // ローカルIPフィルター
    if (state.filters.localIp && state.filters.localIp !== 'all') {
      params.localIp = state.filters.localIp;
    }
    
    // リモートIPフィルター
    if (state.filters.remoteIp && state.filters.remoteIp !== 'all') {
      params.remoteIp = state.filters.remoteIp;
    }
    
    // ポートフィルター
    if (state.filters.ports && state.filters.ports.length > 0 && !state.filters.ports.includes('all')) {
      params.ports = state.filters.ports.join(',');
    }
    
    console.log('フィルター適用後のパラメータ:', { ...params });
  }

  // 統計データを取得
  async function fetchStats() {
    try {
      console.log('統計データ取得開始...');
      
      // APIパラメータの構築
      const params = {};
      
      // フィルターの適用
      applyFiltersToParams(params);
      
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
      
      // 統計情報を更新
      updateStats();
      
      // チャートを更新
      updateCharts();
      
      console.log('UI更新完了');
    } catch (error) {
      console.error('UI更新エラー:', error);
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
      // サーバー別リモートIPの集計チャート
      updateRemoteIpByServerChart();
      
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
  
  // サーバー別リモートIP集計チャートを更新
  function updateRemoteIpByServerChart() {
    try {
      // データがない場合
      if (!state.data.stats.remoteIpByServer || state.data.stats.remoteIpByServer.length === 0) {
        // 既存のチャートを破棄
        if (state.charts.remoteIpByServer) {
          state.charts.remoteIpByServer.destroy();
          state.charts.remoteIpByServer = null;
        }
        
        // キャンバスにメッセージを表示
        const ctx = elements.remoteIpByServerChart.getContext('2d');
        ctx.clearRect(0, 0, elements.remoteIpByServerChart.width, elements.remoteIpByServerChart.height);
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#7f8c8d';
        ctx.fillText('データがありません', elements.remoteIpByServerChart.width / 2, elements.remoteIpByServerChart.height / 2);
        
        return;
      }
      
      // サーバーごとに色を割り当て
      const serverColors = {};
      const allServers = state.data.serverList || [];
      
      allServers.forEach((server, index) => {
        serverColors[server] = getChartColor(index);
      });
      
      // リモートIPをグループ化
      const remoteIps = [...new Set(state.data.stats.remoteIpByServer.map(item => item.remote_ip))];
      const datasets = [];
      
      // トップ10のリモートIPに絞る
      const topRemoteIps = remoteIps.slice(0, 10);
      
      // サーバーごとのデータセットを作成
      allServers.forEach((server) => {
        const data = [];
        
        // 各リモートIPについて、そのサーバーの接続数を取得
        topRemoteIps.forEach(ip => {
          const match = state.data.stats.remoteIpByServer.find(
            item => item.server === server && item.remote_ip === ip
          );
          
          data.push(match ? match.count : 0);
        });
        
        // 接続がある場合のみデータセットに追加
        if (data.some(val => val > 0)) {
          datasets.push({
            label: server,
            data: data,
            backgroundColor: serverColors[server],
            borderColor: serverColors[server],
            borderWidth: 1
          });
        }
      });
      
      // データの準備
      const chartData = {
        labels: topRemoteIps,
        datasets: datasets
      };
      
      // チャートのオプション
      const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            title: {
              display: true,
              text: 'リモートIP'
            }
          },
          y: {
            stacked: true,
            title: {
              display: true,
              text: '接続数'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.raw}回`;
              }
            }
          },
          legend: {
            position: 'top'
          },
          title: {
            display: true,
            text: 'サーバー別リモートIP接続分布'
          }
        }
      };
      
      // 既存のチャートを破棄
      if (state.charts.remoteIpByServer) {
        state.charts.remoteIpByServer.destroy();
      }
      
      // 新しいチャートを作成
      const ctx = elements.remoteIpByServerChart.getContext('2d');
      state.charts.remoteIpByServer = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: options
      });
    } catch (error) {
      console.error('サーバー別リモートIPチャート更新エラー:', error);
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
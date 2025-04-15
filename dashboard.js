<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>攻撃者IP調査ダッシュボード</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
</head>
<body>
    <div class="container">
        <header>
            <h1>攻撃者IP調査ダッシュボード</h1>
        </header>

        <!-- ローディング表示 -->
        <div id="loading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>データを読み込み中...</p>
        </div>

        <!-- ダッシュボードコンテンツ -->
        <div id="dashboard" class="hidden">
            <!-- フィルターセクション -->
            <section class="filters-section">
                <h2>フィルター</h2>
                <div class="filters-container">
                    <div class="filter-group">
                        <label for="server-filter">サーバー:</label>
                        <select id="server-filter" multiple></select>
                    </div>
                    <div class="filter-group">
                        <label for="local-ip-filter">ローカルIP:</label>
                        <select id="local-ip-filter"></select>
                    </div>
                    <div class="filter-group">
                        <label for="remote-ip-filter">リモートIP:</label>
                        <select id="remote-ip-filter"></select>
                    </div>
                    <div class="filter-group">
                        <label for="port-filter">ポート:</label>
                        <select id="port-filter" multiple></select>
                    </div>
                </div>
            </section>

            <!-- 統計サマリーセクション -->
            <section class="stats-summary">
                <div class="stat-card">
                    <h3>接続数</h3>
                    <p id="connection-count">0</p>
                </div>
                <div class="stat-card">
                    <h3>ユニークIP数</h3>
                    <p id="unique-ip-count">0</p>
                </div>
                <div class="stat-card">
                    <h3>最多攻撃元IP</h3>
                    <p id="top-attacker">-</p>
                </div>
            </section>

            <!-- チャートセクション -->
            <section class="charts-section">
                <div class="chart-container">
                    <h3>攻撃元IP別接続数</h3>
                    <canvas id="remote-ip-chart"></canvas>
                </div>
                <div class="chart-container">
                    <h3>サーバー別接続数</h3>
                    <canvas id="server-chart"></canvas>
                </div>
                <div class="chart-container">
                    <h3>ポート別接続数</h3>
                    <canvas id="port-chart"></canvas>
                </div>
            </section>

            <!-- データテーブルセクション -->
            <section class="data-table-section">
                <h2>接続データ</h2>
                <div class="table-container">
                    <table id="connection-table">
                        <thead>
                            <tr>
                                <th>タイムスタンプ</th>
                                <th>サーバー</th>
                                <th>ローカルIP</th>
                                <th>ポート</th>
                                <th>リモートIP</th>
                                <th>ステータス</th>
                            </tr>
                        </thead>
                        <tbody id="connection-table-body">
                            <!-- テーブルデータはJavaScriptで動的に挿入 -->
                        </tbody>
                    </table>
                </div>
                
                <!-- ページネーション -->
                <div class="pagination">
                    <button id="prev-page" disabled>&laquo; 前へ</button>
                    <span id="pagination-info">1 - 10 / 0</span>
                    <button id="next-page" disabled>次へ &raquo;</button>
                </div>
            </section>
        </div>
    </div>

    <script src="dashboard.js"></script>
</body>
</html>
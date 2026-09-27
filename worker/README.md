# netkeiba用CORSプロキシ（Cloudflare Workers）

トラックバイアス予想ツール（`index.html`）がスマホのブラウザから直接netkeibaのページを取得しようとすると、ブラウザのCORS制限や無料の汎用中継サービスの不安定さにより、取得に失敗することがあります。この`proxy.js`は、自分専用の軽量な中継サーバーとしてCloudflare Workersにデプロイして使うためのものです。

## デプロイ手順（ブラウザだけ・CLI不要・3分程度）

1. [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) で無料アカウントを作成（クレジットカード不要）
2. ログイン後、左メニューの **Workers & Pages** を開く
3. **Create** → **Workers** → **Create Worker** を選ぶ（名前は任意、例: `keiba-proxy`）
4. 作成後の画面で **Edit code**（またはQuick edit）を開く
5. エディタの中身を全部消して、このリポジトリの `worker/proxy.js` の内容を貼り付ける
6. **Deploy** をクリック
7. デプロイ後に表示される `https://keiba-proxy.あなたのサブドメイン.workers.dev` のようなURLをコピー

## アプリ側の設定

トラックバイアス予想ツールを開き、右上の⚙️（設定）から、コピーしたWorkerのURLを貼り付けて保存してください。以降、レース結果の取得はこのWorker経由が優先され、より安定して自動取得できるようになります。

## 補足

- `proxy.js`は`netkeiba.com`系のホストしか中継しない制限付きなので、誰でも使える汎用オープンプロキシにはなりません（悪用されにくい設計）
- Cloudflare Workersの無料枠は1日10万リクエストまでで、この用途では十分すぎるほど余裕があります

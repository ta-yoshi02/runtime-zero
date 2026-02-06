Original prompt: Vite + Phaser で 2D横スクロールアクション「Runtime: Zero」を段階実装。今回は最初の縦切りとして、Viteデフォルト画面を Phaser 起動へ置換し、Title → Stage Select → Stage1 → Result の遷移、可変ジャンプ/ジャンプバッファ/コヨーテを最初から実装し、拡張しやすい構成にする。仮アセットで進める。

## 2026-02-06
- セッション開始。skills: develop-web-game / playwright を適用。imagegen は今回未使用（仮図形アセットのため）。
- Phaser最小縦切りを実装: Scene分割（Boot/Title/StageSelect/StagePlay/Result）、session store、stage data、入力システム、プレイヤー制御を追加。
- 操作感（可変ジャンプ/ジャンプバッファ/コヨーテ）を `PlayerController` に実装。
- Pauseメニュー（Resume/Restart/Exit）と Result 戻り導線を追加。
- `window.render_game_to_text` を各Sceneで公開。
- `vite.config.ts` を追加し、`VITE_BASE_PATH` または `VITE_USE_GH_PAGES_BASE=1` / `GITHUB_ACTIONS=true` で `base='/runtime-zero/'` に切替可能化。
- 検証: `npm run build` 成功、`VITE_USE_GH_PAGES_BASE=1 npm run build` 成功（dist内の参照が `/runtime-zero/` になることを確認）。
- 制約: Playwright導入/実行はネットワーク到達不可（ENOTFOUND registry.npmjs.org）で未実施。dev server は 127.0.0.1:5173 で 200 応答を確認。
- Main Menu/Credits/Tuning Scene を追加し、画面フローを Title -> Main Menu -> Stage Select -> Ingame -> Result に拡張。
- Stage Select から Options(Tuning) 遷移を追加（O/F1）。
- Tuning UI を実装：スライダー調整（キー/マウス対応）+ `localStorage` 永続化（`runtime-zero:tuning-overrides:v1`）。
- プレイヤー操作を拡張：Run（Shift/X）、Wall Jump、Slide（Run+Down）、Ground Pound（空中Down）。
- Mirror時の左右入力反転を追加（ステージ反転と整合）。
- カメラ先読みを通常/ダッシュで分離し、Tuning値を反映。
- 検証: `npm run build` 成功、`VITE_USE_GH_PAGES_BASE=1 npm run build` 成功。
- 保留: 自動プレイ検証（Playwright導入不能のため）、敵/アイテム/変身/攻撃/CI/README 等。

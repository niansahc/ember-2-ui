# Changelog

## [0.7.1](https://github.com/niansahc/ember-2-ui/compare/ember-2-ui-v0.7.0...ember-2-ui-v0.7.1) (2026-04-12)


### Features

* add About panel with Ember's story, beliefs, and full ethos ([eb7d3bd](https://github.com/niansahc/ember-2-ui/commit/eb7d3bd321089c07c4383ee7499b50f9d3776300))
* add Claude Code hooks — .env protection and auto-test runner ([54d6f63](https://github.com/niansahc/ember-2-ui/commit/54d6f63b829e4e277983c99752268539c44f6214))
* add edit button on user messages to edit and resend ([83c94b0](https://github.com/niansahc/ember-2-ui/commit/83c94b047ab88e72d09c61590d7569c7af64b6e5))
* add Playwright e2e testing setup for UI — sidebar, settings, model indicator ([2829b37](https://github.com/niansahc/ember-2-ui/commit/2829b376866965c275a9258c4468c018b085fbcd))
* add Playwright tests for file upload, model switching, and mobile viewport ([c382540](https://github.com/niansahc/ember-2-ui/commit/c3825402b39face92efbb444f5b41c2c988434b4))
* add PWA manifest for home screen installation on Android and iOS ([2671ace](https://github.com/niansahc/ember-2-ui/commit/2671acebc9607b0807560e0556d0549380d831bc))
* ADR-012 Phase 2 UI — lock screen, PIN setup, idle timeout, settings controls ([1ffd61d](https://github.com/niansahc/ember-2-ui/commit/1ffd61d253430ebe7a8a775015bfa560276cfae5))
* conversational style selector in settings UI ([35a8aa3](https://github.com/niansahc/ember-2-ui/commit/35a8aa33a65d06fd87c07cf5d7a2c4be46a1b8cd))
* file attachment split — images to chat, documents to vault ([ac9b8f0](https://github.com/niansahc/ember-2-ui/commit/ac9b8f0b2a3e98711cdc060e50ce69a541beb9c4))
* guided first-run UI tour using Shepherd.js ([a2273a4](https://github.com/niansahc/ember-2-ui/commit/a2273a47ca088ff5ab68a4124c971549f6190ec6))
* initial UI scaffold with chat, sidebar, settings, themes, accessibility, mock API ([e0c4e1f](https://github.com/niansahc/ember-2-ui/commit/e0c4e1fe7bee70a404e3d7ebc8692b78a03382bc))
* multi-image upload — select and send multiple images in a single message ([e16566c](https://github.com/niansahc/ember-2-ui/commit/e16566ce52e109f82d9314607110ddd8d09ddcb1))
* refresh task tray immediately when chat streaming ends ([1441051](https://github.com/niansahc/ember-2-ui/commit/1441051084e0ff2bef963cb54e47b4da91a65a66))
* **settings:** add Change PIN flow for v0.15.0 ([1ad7f9e](https://github.com/niansahc/ember-2-ui/commit/1ad7f9ee3ccf3957cf8864586b3d6d709260b0e1))
* **settings:** add developer vault switcher and header badge ([dc4741b](https://github.com/niansahc/ember-2-ui/commit/dc4741bd438cf34745643acad28532975db831a6))
* **settings:** add disk encryption status to Security tab ([57901f5](https://github.com/niansahc/ember-2-ui/commit/57901f570208923b6396820d2224c7661c60435b))
* task tray in sidebar — bottom-anchored, follows conversation list visual style ([cd1217f](https://github.com/niansahc/ember-2-ui/commit/cd1217f76e15da240500dd93877b4c83456b6777))
* **ui:** add Launch Installer button to update section ([23dbb56](https://github.com/niansahc/ember-2-ui/commit/23dbb567dc7c6bd21d73e9c3e129e3056a17145a))
* **ui:** add privacy disclosure (i) button to bug report modal ([6cb9d6c](https://github.com/niansahc/ember-2-ui/commit/6cb9d6c3d63b79d4532ca33159a0f1b0ce762957))
* **ui:** add service status indicator with ember-style glow ([a3ca7b4](https://github.com/niansahc/ember-2-ui/commit/a3ca7b499a78e303fd20ea8e24a03e248172e267))
* **ui:** add shutdown button to service status indicator ([457143b](https://github.com/niansahc/ember-2-ui/commit/457143b9124f84db9bf85ee5c3d5e8069378ee2c))
* **ui:** add temporary restart onboarding button to About tab ([7d2f110](https://github.com/niansahc/ember-2-ui/commit/7d2f110744b6fa4058195869f641c78179a86bfd))
* **ui:** add web_search_autonomous toggle in Settings Features tab ([81d0d8f](https://github.com/niansahc/ember-2-ui/commit/81d0d8f236cc9446eb03bfa5fbf436fe8aa58cd4))
* **ui:** custom theme with color picker ([96e716e](https://github.com/niansahc/ember-2-ui/commit/96e716ed70bcc7752b2481362d0bc904c04c13d5))
* **ui:** deviation detection toggle in Features tab ([7f6cd92](https://github.com/niansahc/ember-2-ui/commit/7f6cd9256fba58ae9d975532942974401316407c))
* **ui:** lodestone findings grouped by category with deduplication ([cea6ece](https://github.com/niansahc/ember-2-ui/commit/cea6ece490eedfc435f49f048acfb00970725165))
* **ui:** lodestone panel full redesign — five category sections with approved display names ([ed2b10e](https://github.com/niansahc/ember-2-ui/commit/ed2b10e54bc9e5e4cf0a7ab8790c6645981e913d))
* **ui:** lodestone panel in Memory tab with confirm/edit/dismiss ([a8073c4](https://github.com/niansahc/ember-2-ui/commit/a8073c49d6e5c25c7d7e420298b17b449dba4cd2))
* **ui:** nature constellation toggle, copyright footer, version fallback fix ([16fbe78](https://github.com/niansahc/ember-2-ui/commit/16fbe783970d5b38141f79a2cabff958c895ae87))
* **ui:** onboarding flow Steps 1-3 — profile form, lodestone gate, questionnaire ([c574f58](https://github.com/niansahc/ember-2-ui/commit/c574f58c740423f58da6cac3b2ba1d118d587058))
* **ui:** onboarding Step 4 — lodestone review with confirm/edit/dismiss ([091ddce](https://github.com/niansahc/ember-2-ui/commit/091ddcebb7f74d4dde88498f3fdf28ed2b7ee251))
* **ui:** open all chat response links in new tab ([66d97b2](https://github.com/niansahc/ember-2-ui/commit/66d97b24c57d73eeb3ae665bbf74e62e53dd98fc))
* **ui:** redesign lodestone panel — summary, survey button, collapsible findings ([d9651bf](https://github.com/niansahc/ember-2-ui/commit/d9651bfaa07f797fb738b5b272266556a8eb0565))
* **ui:** redesign Settings as full-page tabbed layout ([1ff210e](https://github.com/niansahc/ember-2-ui/commit/1ff210e4bab18f17bc8a14f056825b683f00d491))
* **ui:** replace bug report form with direct GitHub issues link ([4337406](https://github.com/niansahc/ember-2-ui/commit/4337406ebb4bbc4d5824ad1cc65e33d921df4f76))
* **ui:** Step 4 shows inferred values with raw answer as context ([6097bbf](https://github.com/niansahc/ember-2-ui/commit/6097bbf66d9b9d1c4134e8906b79d6819571674e))
* **ui:** web search before indicator, grounding check signals, inline source citations ([239983d](https://github.com/niansahc/ember-2-ui/commit/239983d8826dcfaa9dd199e2fa7632df8f7e1b77))
* **ui:** wire vault citation UI to backend signals ([4fdee29](https://github.com/niansahc/ember-2-ui/commit/4fdee296cbdce3becff0fa5570c25ce760e3d876))
* **v0.11.0-wip:** .txt upload support, document context injected into chat message ([9fa9e13](https://github.com/niansahc/ember-2-ui/commit/9fa9e13195ab5cedbae0251d0e163ec3c65eba7c))
* **v0.11.0-wip:** add OpenAI models to Cloud tab — gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-3.5-turbo ([ae9ef56](https://github.com/niansahc/ember-2-ui/commit/ae9ef56119084ac892217df41afc5ff0a58314e7))
* **v0.11.0-wip:** collapsible sidebar, model indicator, local/cloud model selector tabs, cloud disclosure, vision default on ([7ada90c](https://github.com/niansahc/ember-2-ui/commit/7ada90c682e4cefe8204bd3c0981c76e31b3f1b3))
* **v0.11.0-wip:** fix sidebar icon row order — new, search, collapse ([0efb959](https://github.com/niansahc/ember-2-ui/commit/0efb9595f25a3b9770d6f453123014ad1d75dc89))
* **v0.11.0-wip:** move model indicator to top bar next to Ember-2 title ([de137b4](https://github.com/niansahc/ember-2-ui/commit/de137b4106a769364f957f981ce9c7ab8970f1b5))
* **v0.11.0-wip:** remove search icon from sidebar top row, keep plus and collapse only ([fb3b9f1](https://github.com/niansahc/ember-2-ui/commit/fb3b9f1aaec17089804ce21974995ab6c8bd968d))
* **v0.11.0-wip:** secure API key entry in Cloud tab — masked input, system credential store, never displayed ([fbc34d9](https://github.com/niansahc/ember-2-ui/commit/fbc34d9dc86bd7bb7f07fd6f224928620adfccff))
* **v0.11.0-wip:** vault path masking with timed reveal — ADR-012 Phase 1 ([7dbeca1](https://github.com/niansahc/ember-2-ui/commit/7dbeca1e067222b0522d066e4cdec3f52077f645))
* web search info tooltip in settings with accurate privacy description ([d1dfd52](https://github.com/niansahc/ember-2-ui/commit/d1dfd52a8f9120d18845d5453832eb208ddbe57e))
* web search transparency indicator on messages that used web search ([74b8a13](https://github.com/niansahc/ember-2-ui/commit/74b8a13d6f44b40e86c8a4077a413987cd04299e))
* wire all components to real Ember API with mock fallback ([acef693](https://github.com/niansahc/ember-2-ui/commit/acef6938e8825b41e902c820a9f6684fd8f01e3b))
* wire sidebar to real projects API with mock fallback ([01f2e7e](https://github.com/niansahc/ember-2-ui/commit/01f2e7e70470414bd5067c48e422a274c8c374a1))
* wire UI to streaming API — tokens appear in real time ([c2ee27b](https://github.com/niansahc/ember-2-ui/commit/c2ee27bf969117a4b3a3003d425bf8e9f86278d8))


### Bug Fixes

* **a11y:** WCAG 2.1 AA audit fixes for new components ([8eda9a4](https://github.com/niansahc/ember-2-ui/commit/8eda9a4fbeb4a99b3d58a3f589783d0422ddaf0d))
* add new conversation button and search bar to project detail sidebar view ([b651cec](https://github.com/niansahc/ember-2-ui/commit/b651cec3e115e8b14a0d435934892fabbcce53db))
* add New Project button and context menu option to sidebar UI ([fa40561](https://github.com/niansahc/ember-2-ui/commit/fa405618599725926ee0be05adb6300d2f0b1581))
* edge case tests — overlay click blocking, mobile settings selector ([c821880](https://github.com/niansahc/ember-2-ui/commit/c8218801be153562861fa083950dbb933b21d8a5))
* filter vunknown/unknown version values from backend health endpoint ([a717dde](https://github.com/niansahc/ember-2-ui/commit/a717dde3873119d1d6fb30fdaaccda6f4dd65e62))
* increase project row wait timeout in sidebar e2e tests — 5s instead of 2s ([4d90040](https://github.com/niansahc/ember-2-ui/commit/4d90040f6c75a27c549c337e3a193ed4db51751e))
* increase task tray visibility timeout to cover full poll interval ([aaecc35](https://github.com/niansahc/ember-2-ui/commit/aaecc35add61c87b90ea3318b83b1d95257b6137))
* mobile chat input missing + project conversations not saving to project ([19c0b31](https://github.com/niansahc/ember-2-ui/commit/19c0b31b0d5d3d5d88f69a8d711a020d15efa7a7))
* parse hyphenated vault timestamps correctly -- no more Invalid Date in chat UI ([ec0ca4d](https://github.com/niansahc/ember-2-ui/commit/ec0ca4ddfb32d51d14a1e590c5c5cee9df67ea85))
* prefer runtime-injected API key over build-time env var ([9ab93e0](https://github.com/niansahc/ember-2-ui/commit/9ab93e0dcd6eb825f0bd8204c76807bdb9a6c1ad))
* replace dangling SearchBar component reference with inline JSX ([ba14b8f](https://github.com/niansahc/ember-2-ui/commit/ba14b8fa41750e10f94246dfef833342073242d6))
* restore active conversation on page refresh via localStorage ([5703cca](https://github.com/niansahc/ember-2-ui/commit/5703cca5747320b4aaefa37aec87f424470f6d19))
* search bar no longer loses focus on each keystroke ([59a6727](https://github.com/niansahc/ember-2-ui/commit/59a6727408210c9b30b2c90bb86ed6af512ff8fa))
* **security:** proxy bug report submission through backend, remove GitHub token from frontend ([483b86d](https://github.com/niansahc/ember-2-ui/commit/483b86dcfe7502cb72acb1efb9b30dabf4447cc9))
* **settings:** clarify conversation memory toggle is a global setting ([c88a371](https://github.com/niansahc/ember-2-ui/commit/c88a371ff7b48027b1b4df560179b257adec7095))
* **settings:** disk encryption link falls back to platform when method is null ([8d92acc](https://github.com/niansahc/ember-2-ui/commit/8d92acc432a79e5ba35ebf4ff4a8e09f121b66ca))
* **settings:** fix autonomous search default, tooltip clipping, status dot position ([7926648](https://github.com/niansahc/ember-2-ui/commit/7926648d73803acfb7cdc3fe1696f1b5099671de))
* **settings:** remove developer vault badges from header and sidebar ([5e4e151](https://github.com/niansahc/ember-2-ui/commit/5e4e15105778e40cb0b05e5e32c592af88c32a32))
* **settings:** remove redundant path masking in Developer tab ([4dbe462](https://github.com/niansahc/ember-2-ui/commit/4dbe462cbe77d43dc186de859b6134be260a1ccf))
* **settings:** restore Switch Vault button and header badge in dev mode ([49be784](https://github.com/niansahc/ember-2-ui/commit/49be78483c10556d0043555c2b145dd61d9492b1))
* **settings:** sync vault display across Memory and Developer tabs ([5fa910d](https://github.com/niansahc/ember-2-ui/commit/5fa910db384e04e51165c5bafac8b1e28c675213))
* **settings:** wire Switch Vault buttons to vault swap endpoint ([15211e0](https://github.com/niansahc/ember-2-ui/commit/15211e0078405b961a52cb1941f1b772e9344722))
* show API key setup instructions on splash when VITE_EMBER_API_KEY is missing ([d8a45f8](https://github.com/niansahc/ember-2-ui/commit/d8a45f887f0cfb125d8bd64f7377b24af78a27b1))
* skip task tour step when no tasks exist — cleaner for new users ([b3fcf19](https://github.com/niansahc/ember-2-ui/commit/b3fcf196750d8c80376492a296f8d05f05af9f39))
* stabilize task tray uncheck test — add wait for task write before reload ([3e6d6af](https://github.com/niansahc/ember-2-ui/commit/3e6d6afa01189c8982b71adb3e8a58f57f90405b))
* task tray — checkbox reappear, title navigation, expand/collapse ([17dfdc6](https://github.com/niansahc/ember-2-ui/commit/17dfdc6627953c665d52c994a0ffffaeb6209e58))
* task tray checkbox toggles done/active state without disappearing, task title navigation wired to session ([8fc25d3](https://github.com/niansahc/ember-2-ui/commit/8fc25d31ea82db3ef830688df53e6797a6cd0e09))
* task tray max-height and internal scroll -- tasks no longer push settings off screen ([9234c02](https://github.com/niansahc/ember-2-ui/commit/9234c024e4f21b662d5285cd61c4d6f907f0ef16))
* **tests:** add graceful skip conditions to backend-dependent tests ([ee0bc52](https://github.com/niansahc/ember-2-ui/commit/ee0bc524c895c5c14dbbbe5cd0efcfc2a5f9f842))
* **tests:** bump timeout for backend-dependent task-tray tests ([af621d0](https://github.com/niansahc/ember-2-ui/commit/af621d097078d2255693c8d1d14bfd8aee1e7476))
* **tests:** floating point precision in mobile overflow test, version test timeout ([4c28543](https://github.com/niansahc/ember-2-ui/commit/4c28543738ab8b2437af56bfdb2c1ea0a56ef16a))
* **tests:** resolve flaky e2e tests for v0.15.0 release gate ([78f7532](https://github.com/niansahc/ember-2-ui/commit/78f753205d0b07b1cd2bdc7136f42d54097f1209))
* tour step z-index above modal overlay — buttons now clickable ([485f85a](https://github.com/niansahc/ember-2-ui/commit/485f85af6181fe5334b020c926c1453bcb3dfe8e))
* **ui:** add Confirm button to proposed lodestone records ([bb704c7](https://github.com/niansahc/ember-2-ui/commit/bb704c727e3ab36911a1cac6f176a687b6a858b2))
* **ui:** anchor service dot to right edge so it doesn't shift on hover ([a183eee](https://github.com/niansahc/ember-2-ui/commit/a183eee439bd0db3c8603b77b8af9f07e66a31c8))
* **ui:** conversation navigation, task click navigation, task delete button ([553cb60](https://github.com/niansahc/ember-2-ui/commit/553cb6081226bb5a964e31cc7159cb88020d9340))
* **ui:** Dismiss available on all lodestone records, Confirm only on non-onboarding ([931e4ee](https://github.com/niansahc/ember-2-ui/commit/931e4ee395bbf2e9bc1806fba3e40bd0515884d5))
* **ui:** fix vault citation indicator style and suppress empty sources ([3720514](https://github.com/niansahc/ember-2-ui/commit/3720514195c6630c68dc4a2ee75c1948f07aca5b))
* **ui:** lodestone category actions — add/delete on opposite ends, danger-styled delete ([89b83d3](https://github.com/niansahc/ember-2-ui/commit/89b83d3136fc487690ddc4021832e8322207defd))
* **ui:** model indicator now confirms from API instead of using stale value ([85ec485](https://github.com/niansahc/ember-2-ui/commit/85ec485693c9b4c5d714326106fd9511e5aaa874))
* **ui:** move service status dot to bottom-left, away from all controls ([c617e13](https://github.com/niansahc/ember-2-ui/commit/c617e130417931f7ab892e8f73fd4ba0b8421bda))
* **ui:** move service status dot to bottom-left, away from all controls ([20daa8d](https://github.com/niansahc/ember-2-ui/commit/20daa8d47385bf4677967323a87697f9b15e5b7e))
* **ui:** onboarding completion opens Settings Memory tab with lodestone summary ([ab10b0d](https://github.com/niansahc/ember-2-ui/commit/ab10b0d7ec15f3127f5fa1e2b063acc599f73422))
* **ui:** onboarding lodestone records show Edit only, no Confirm/Dismiss ([b5028dc](https://github.com/niansahc/ember-2-ui/commit/b5028dc81f0485ea9566bac0e4eed1cc386c958d))
* **ui:** onboarding pre-populates previous answers on restart ([dc55062](https://github.com/niansahc/ember-2-ui/commit/dc55062604f351761fa8e9a0d6c942fff974c041))
* **ui:** prevent duplicate API calls on load with StrictMode-safe effects ([68c56a5](https://github.com/niansahc/ember-2-ui/commit/68c56a5a3138765f02c412e193f7b8891fff2869))
* **ui:** prevent source citation overflow on narrow mobile viewports ([a5290a5](https://github.com/niansahc/ember-2-ui/commit/a5290a5dc9ecc058e4b0c238d645c661a2151fcb))
* **ui:** remove dead onRenameConversation stub from App.jsx ([7820dc0](https://github.com/niansahc/ember-2-ui/commit/7820dc02b09ee17406676ca8f5599402efceaf9e))
* **ui:** remove duplicate Deviation Engine description text ([bd99ba2](https://github.com/niansahc/ember-2-ui/commit/bd99ba2a8cd27afda424765fbffed6421b0e2078))
* **ui:** remove non-functional "Remove PIN" button from Settings ([79b769e](https://github.com/niansahc/ember-2-ui/commit/79b769ed12ea7ae9533dda263925b0692d8431cf))
* **ui:** remove non-functional "Update Ember" button ([56b2d9c](https://github.com/niansahc/ember-2-ui/commit/56b2d9c06a56d99136610c806f234c7d5a058ee4))
* **ui:** rename deviation toggle — Deviation Engine with info tooltip ([4a18484](https://github.com/niansahc/ember-2-ui/commit/4a184844a36c20220448cbf3110a831d02f9617e))
* **ui:** resolve sidebar conversation links calling non-existent /turns sub-route (BUG-001) ([4eaf61c](https://github.com/niansahc/ember-2-ui/commit/4eaf61c55dfdc80c271ff866ad4918eafd793e7d))
* **ui:** restore conditional onboarding text, remove dev tool button ([2572210](https://github.com/niansahc/ember-2-ui/commit/257221034dc4619b4d1990da1a36dcec82e38a77))
* **ui:** saving indicator on lodestone submit, auto-expand findings on arrival ([46ca056](https://github.com/niansahc/ember-2-ui/commit/46ca056dfecd2ba3336802bd20002493cb91c85a))
* **ui:** Settings tab layout — memory icon, vision to Features, remember to Security ([9796ab1](https://github.com/niansahc/ember-2-ui/commit/9796ab181906e6f3ee978f5d706c45836df7aedd))
* **ui:** sidebar re-fetches conversations on navigation and stream end ([6188382](https://github.com/niansahc/ember-2-ui/commit/6188382025904db2439773d258623da9a7030f13))
* **ui:** single API status dot, move indicator away from send button ([b9e9def](https://github.com/niansahc/ember-2-ui/commit/b9e9def65c9f3197d4ced6f7bf0f13578a6f3317))
* **ui:** surface lodestone cap error, remove diagnostic logs ([813173c](https://github.com/niansahc/ember-2-ui/commit/813173cdf1752f56bdfd0d9f4e1f877bc853596e))
* **ui:** task delete waits for API confirmation, shows inline error on failure ([69dd6ff](https://github.com/niansahc/ember-2-ui/commit/69dd6fff3c5aa6d2dc4b13260cfef80bfb17ddf1))
* **ui:** toggle hover titles, collapsed sidebar click-to-expand, lodestone collapsible ([afedabc](https://github.com/niansahc/ember-2-ui/commit/afedabcb906edf19982dd2735b15ee0bff303839))
* **ui:** web search indicator shows after stream completes, not on header ([bdebca8](https://github.com/niansahc/ember-2-ui/commit/bdebca83335746728bb904c6e29c144d16bbbbc2))
* **v0.11.0-wip:** cloud model selection calls POST /model to actually switch the active model ([7c8aa82](https://github.com/niansahc/ember-2-ui/commit/7c8aa82b93816a5f1d271b18152d2bf3a50791a6))
* **v0.11.0-wip:** collapse chevron at top when sidebar is collapsed ([f680059](https://github.com/niansahc/ember-2-ui/commit/f680059054a28d93155ea28761e422358cbc5fcc))
* **v0.11.0-wip:** explicit Remove key button with confirmation dialog replaces ambiguous X ([355678a](https://github.com/niansahc/ember-2-ui/commit/355678aed1444f9c30437b630f34e6d0a032efd9))
* **v0.11.0-wip:** persist vision model toggle and selection in localStorage ([5dff195](https://github.com/niansahc/ember-2-ui/commit/5dff19557aa042e97a2913a5a7c0361ec83c4259))
* **v0.11.0-wip:** remove API key input from UI — display only, add set_provider_key.py CLI script ([3b8892f](https://github.com/niansahc/ember-2-ui/commit/3b8892fcc12c1ddfdd10b8db48b9548e5b029087))
* **v0.11.0-wip:** restyle model tabs as underline tabs for visibility ([1ad806c](https://github.com/niansahc/ember-2-ui/commit/1ad806ce88481052c15712c5f358492699fd8024))
* **v0.11.0-wip:** show search icon in collapsed sidebar, expands and focuses search ([4b58144](https://github.com/niansahc/ember-2-ui/commit/4b58144930eb3427e7a5f0fbaa0c0b0506df0562))
* **v0.11.0-wip:** Updates panel reads installed version from API instead of hardcoded string ([cdf50ff](https://github.com/niansahc/ember-2-ui/commit/cdf50ff5bca423b03e22b5d3c8e83a006d444771))
* wire API key auth across all ember.js calls ([34bc91d](https://github.com/niansahc/ember-2-ui/commit/34bc91d2130bfdd5dc463fa376e8f1494d22a99d))


### Performance Improvements

* **ui:** fix settings re-render storm, boot chain, idle listener churn ([7fe9b81](https://github.com/niansahc/ember-2-ui/commit/7fe9b816c495b6e4e1ac766c5634246061e9a958))

## v0.7.4 — 2026-04-12

### Features
- Launch Installer button in Settings > About tab

### Bug Fixes
- Autonomous web search toggle now defaults to OFF (was showing ON from stale backend pref)
- Web search tooltip no longer clips outside Settings panel bounds
- Service status dot repositioned inside content area — never overlaps sidebar or input controls

---

## v0.7.3 — 2026-04-12

### Features
- Change PIN flow — Settings > Security, verify current → enter new → confirm
- Disk encryption status — Settings > Security, Device Security section with platform-appropriate docs link
- Service status indicator — breathing amber dot above send button, hover for restart/shutdown panel
- Developer vault switcher — Settings > Developer tab (dev mode only), vault swap with rebuilding note
- Vault citation UI — unified "Source: Vault / Web Search / LLM" label on every assistant message
- Header/sidebar badges showing active vault label in dev mode

### Performance
- Settings wrapped in React.memo, deferred tab-specific API fetches (lodestone, developer status)
- MessageBubble wrapped in React.memo — siblings no longer trigger re-renders
- Boot chain: dropped redundant model fetch, cut splash delay 600ms → 200ms
- Idle timeout: 4 raw DOM listeners → 2 passive with 1s debounce

### Accessibility
- focus-visible on all new interactive elements (7 selectors)
- Service dots keyboard-accessible (Enter/Space to expand)
- PIN error messages announced via aria-live
- Touch targets at 44px minimum

### Bug Fixes
- Disk encryption link falls back to platform when method is null (case-insensitive)
- Conversation memory toggle label clarified as global setting
- Flaky e2e tests resolved via shared mock-bootstrap helper (107 passing, 0 flaky)
- Service status dot positioned to never overlap input controls

### Tests
- 45 new Playwright tests across 6 new spec files
- Shared mock-bootstrap.cjs helper for deterministic splash → chat in all specs
- Performance audit documented in docs/performance-audit-v0.15.0.md

---

## v0.7.2 — 2026-04-10

### Security
- Remove GitHub token from frontend build

### Features
- Replace bug report form with direct GitHub Issues link — simpler, no token required, works on any machine
- Privacy disclosure tooltip on bug report modal

### Bug Fixes
- Bump task-tray backend-dependent test timeouts

### Documentation
- Update CLAUDE.md to v0.7.1 state
- Consolidate duplicate sections in CLAUDE.md

---

## v0.7.1 — 2026-04-09

### Bug Fixes
- getConversationTurns now calls correct endpoint (BUG-001) — was calling non-existent /turns sub-route, now calls GET /v1/conversations/{id} and extracts turns from response
- Playwright regression test added for sidebar conversation loading

---

## v0.7.0 — 2026-04-06

### Features
- **Lodestone.** A new layer that builds a record of your values over time from your conversations and reflections. During onboarding you can answer a short survey to seed it directly. Skip it and it builds on its own. Values Ember infers show up in Settings for you to confirm, edit, or dismiss before anything is written.
- **Lodestone panel.** The Memory tab now shows your lodestone records organized by five categories: Character, Relational, Directional, Ground, and Beyond. Each category shows confirmed and proposed records with edit and dismiss controls. You can add records manually, add custom categories, and delete records you don't want. Lodestone seed values and categories can also be edited directly in config/lodestone.yaml and config/lodestone_taxonomy.yaml.
- **Deviation Engine.** Ember tracks when she responds differently than her training would normally produce and records those choices to your vault. Over time, recorded deviations outweigh default patterns in retrieval. Off by default. Enable it in Settings under Features.
- **Automated releases.** Release Please now manages versioning and changelogs.

### Bug Fixes
- Duplicate API calls on page load and Settings open. StrictMode-safe cleanup added to all data-loading effects.
- Collapsed sidebar did not expand on click. Now expands on click anywhere on the sidebar strip.
- Task delete showed no feedback on failure. Now surfaces inline error for 4 seconds.
- Onboarding completion dropped user to blank chat. Now opens Settings to Memory tab with lodestone findings visible.
- Onboarding restart showed empty fields. Now loads previous answers for review and editing.
- Deviation Engine toggle showed duplicate description text. Static duplicate removed.
- Lodestone Confirm button returned 400. Root cause was record cap. UI now surfaces the actual error.
- Settings toggles had no hover feedback. Added dynamic title attributes.
- Web search indicator appeared before response finished. Now shows "Searching..." during generation, badge only after completion.
- Source citation overflow on mobile at 375px/390px. Fixed.

### Known Issues
- Lodestone "Add category" is UI-only. Custom categories are not persisted to the backend and exist only for the current session.
- Onboarding inference quality varies. Some lodestone records may contain raw survey answers instead of inferred value statements if Ollama was unavailable during the POST.
- Mac/Linux installer not yet tested on real hardware. Windows is the only fully validated platform.
- Harness conversations appear in the sidebar. Deviation harness no longer sends X-Test-Session header (required for detection to run), so test conversations are visible.

### Tests
67 Playwright tests (63 passing, 4 skipped)

## v0.6.3 — 2026-04-05

### Bug Fixes
- Duplicate API calls on load — StrictMode-safe cleanup flags on all data-loading useEffects (conversations, projects, tasks, version) prevent 4-6 rapid-fire calls per endpoint on page load
- Task delete error handling — delete now waits for API confirmation before removing from UI; shows inline error on failure (auto-clears after 4s)
- Source citation overflow — overflow-wrap on .bubble-sources prevents long titles from breaking layout on narrow mobile viewports (375px/390px)

### Tests
65 Playwright tests (58 passing, 4 skipped, 3 pre-existing backend-dependent)

## v0.6.2 — 2026-04-04

### Bug Fixes
- Conversation navigation — sidebar click now loads conversation history via /turns endpoint instead of empty metadata response
- Task click navigation — clicking a task navigates to its originating conversation using metadata.session_id
- Task delete button — cancel (X) button on each task, calls DELETE /v1/tasks/{id}, optimistic removal from sidebar

### Features
- Chat response links open in new tab — custom react-markdown renderer adds target="_blank" rel="noopener noreferrer"

## v0.6.1 — 2026-04-04

### Bug Fixes
- Version display — filter "vunknown" and "unknown" values from backend health endpoint; sidebar shows loading state instead of bad version string

## v0.6.0 — 2026-04-04

### Features
- Nature constellation in About panel — 13 facets from nature.yaml v0.1, collapsible toggle below ethos
- Web search before indicator — "Searching the web..." status shown immediately when web search triggers, before results arrive
- Grounding check activity signals — "Verifying..." and "Refining..." status indicators during grounding check and revision pass
- Inline source citations — compact linked sources block below web search responses (max 5)
- Custom theme with color picker — user-defined accent and background colors, persists in localStorage
- Copyright footer — © 2026 M. Chastain Flournoy. All rights reserved.

### Bug Fixes
- Version display — no longer shows "vunknown" when API is unreachable; displays loading state or hides
- Restored index.html source entry — had been overwritten by dist output during deploy
- Runtime API key injection — `window.__EMBER_API_KEY__` preferred over build-time env var
- API key splash instructions — fresh install users see setup guidance instead of generic error

### Docs
- Release workflow documentation (docs/RELEASE_WORKFLOW.md)
- Release checklist hardened — CC owns full release process end to end

### Tests
65 Playwright tests (58 passing, 4 skipped, 3 pre-existing flaky)
- Edge case test suite: input handling, layout stability, localStorage resilience, mobile layout
- Streaming signals and sources tests
- About nature constellation tests

## v0.12.0 — 2026-04-02

### Features
- Multi-image upload — select and send multiple images in a single message; thumbnails shown above message text
- Web search transparency indicator — magnifying glass icon on messages that used web search
- Web search info tooltip in settings — accurate privacy description of SearXNG routing and IP stripping
- Conversational style selector — Casual/Balanced/Thoughtful card selector in settings; persists via preferences API
- Task sidebar tray — bottom-anchored below conversations, checkbox to complete, cancel button, end-of-day expiry, 30s polling, internal scroll capped at ~5 tasks
- Task tray behavior — done tasks persist today with strikethrough, expire end of day, cancelled tasks removed immediately
- Guided first-run tour — Shepherd.js, 6 steps, triggers once via preferences API, keyboard accessible, Ember-themed dark styling
- Restore active conversation on refresh — localStorage persistence of active session
- Regenerate button — confirmed working on last assistant message

### Bug Fixes
- Timestamp fix — hyphenated vault timestamps now parsed correctly, no more Invalid Date in chat UI
- Task tray max-height — tasks no longer push settings off screen; internal scroll within tray
- Soft-deleted conversations — confirmed filtered correctly; regression tests added

### Tests
40 Playwright passing, 3 skipped (up from 36 at v0.11.0)

## v0.3.0 — 2026-03-27
- Streaming responses via streamChat() — real-time token rendering
- PWA manifest — installable as home screen app
- New Project button always visible in sidebar
- Project conversations auto-assigned on creation
- Edit and resend user messages (pencil icon on hover)
- Mobile viewport fix (100dvh)
- Consistent Ember-2 branding throughout
- Stop button works during streaming
- crypto.randomUUID fallback for non-secure contexts (Tailscale HTTP)
- Chat input bar stays visible on long responses (flex min-height fix)

## v0.2.1 — 2026-03-24

### Projects — Real API
- Sidebar now loads projects from `GET /v1/projects` with mock fallback
- Move conversation to project calls `PATCH /v1/conversations/{id}` with `project_id`
- Added to ember.js: `getProjects()`, `createProject()`, `renameProject()`, `deleteProject()`, `getProjectConversations()`, `moveConversationToProject()`
- All operations use optimistic UI updates with async API calls

### API Connectivity
- Vite proxy configured for all backend routes — zero CORS in development
- Health check uses `/v1/models` endpoint (works through proxy)
- All API calls use centralized `authHeaders()` with `VITE_EMBER_API_KEY`

## v0.2.0 — 2026-03-24

First fully functional release of Ember's custom frontend.

### Chat
- Streaming message display with markdown rendering (headings, code blocks, tables, blockquotes, lists)
- Copy message to clipboard, regenerate last response, scroll-to-bottom button
- Typing indicator while Ember is thinking
- Export conversation as markdown (Ctrl+Shift+E)
- Multi-file attachment: images sent as vision input, documents (.pdf, .docx, .csv, .xlsx) uploaded to vault via POST /ingest/upload
- Thumbnail previews for images, file icons for documents, "Sent with your message" / "Added to your vault" labels

### Sidebar
- Conversation list loaded from real API (GET /v1/conversations)
- Projects section with colored dots and conversation counts (UI-only, no backend yet)
- Chronological grouping: Today, Yesterday, Last 7 days, Last 30 days, Older
- Search bar filters conversations by keyword
- Right-click context menu: rename, move to project, delete
- Rename and delete persist to backend (PATCH/DELETE /v1/conversations)

### Settings
- 5 color themes: Ember (purple/orange), Midnight (black/silver), Forest (green), Ocean (blue), Bloom (light pink)
- Theme persisted in localStorage, instant switch
- Model selector populated from real Ollama model list
- Vision model toggle with separate model dropdown
- Web search toggle, conversation memory toggle, tone selector
- Vault path display, check for updates, report a bug, about Ember

### About Panel
- Ember's origin story (Ember-1 → Ember-2)
- Three belief cards: owned intelligence, knowing vs profiling, right to leave
- Expandable full ethos (10 principles)
- License links (AGPL-3.0 + CC BY-NC 4.0), GitHub link, bug report

### Bug Reports
- Submit directly to GitHub Issues API (niansahc/ember-2)
- Title + description form, success state with issue link

### Updates
- Checks GitHub Releases API for latest version
- Shows current vs latest version with changelog viewer

### Accessibility (WCAG 2.1 AA)
- All color combinations pass 4.5:1 contrast ratio
- Keyboard navigable throughout, focus indicators on all elements
- Focus trap in modals, Escape closes all panels
- role="switch" on toggles, aria-modal on dialogs, aria-live for streaming
- prefers-reduced-motion respected
- Screen reader friendly: aria-labels, heading hierarchy, semantic HTML

### API Integration
- Real API client (src/api/ember.js) with mock fallback on all operations
- Session tracking: generates sess_id per conversation, passes X-Session-ID header
- Vite proxy for development (no CORS issues)
- API key auth via VITE_EMBER_API_KEY environment variable
- Console warning if API key is missing

### Keyboard Shortcuts
- Ctrl+N — new conversation
- Ctrl+, — toggle settings
- Ctrl+Shift+E — export conversation
- Escape — close modals and sidebar

## v0.1.0 — 2026-03-24

Initial scaffold with mock API layer.

# WLED-Manager
A web manager for PC, nothing fancy now
Not working all properly.

If you want to try the site, you need to disable the HTTPS protection to allow HTTP calls.

```diff
! Don't use big images for icons. Now it's stored all the data with
! LocalStorage and is not supporting long strings.
```

# To work on PC (Firefox):
1. Open the website https://andro-marian.github.io/WLED-Manager/
2. Click on the Lock icon on the Address bar
3. Click on Connection secure
4. CLick on Disable protection for now

# To work with Android (Firefox Nightly):

If you want to make like an app:
1. Open the website https://andro-marian.github.io/WLED-Manager/
2. Click on the 3 dots menu
3. Click on Add to Home screen
4. Open about:config and type "mixed"
5. The security.mixed_content.block_active_content set to false
```
If you want to open the webiste normal in browser from the shortcut set the step (5.) before (3.)
```
# Images
| PC  | Android |
| ------------- | ------------- |
<img src="https://raw.githubusercontent.com/Andro-Marian/WLED-Manager/refs/heads/main/preview-main.png"> <img src="https://raw.githubusercontent.com/Andro-Marian/WLED-Manager/refs/heads/main/preview-settings.png"> | <img src="https://raw.githubusercontent.com/Andro-Marian/WLED-Manager/refs/heads/main/preview_android.jpg">

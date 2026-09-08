![Updates to runtime protection in macOS Sequoia](https://developer.apple.com/assets/elements/icons/gatekeeper/gatekeeper-256x256_2x.png)

In macOS Sequoia, users will no longer be able to Control-click to override [Gatekeeper](https://developer.apple.com/developer-id/) when opening software that isn’t signed correctly or notarized. They’ll need to visit System Settings > Privacy & Security to review security information for software before allowing it to run.

If you distribute software outside of the Mac App Store, we recommend that you submit your software to be notarized. The Apple notary service automatically scans your Developer ID-signed software and performs security checks. When your software is ready for distribution, it’s assigned a ticket to let Gatekeeper know it’s been notarized so customers can run it with confidence.

[Learn how to notarize your macOS software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)

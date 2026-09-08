# Disable Library Validation Entitlement




## Discussion

The Hardened Runtime enables library validation by default. This security-hardening feature prevents a program from loading frameworks, plug-ins, or libraries unless they’re either signed by Apple or signed with the same Team ID as the main executable. The macOS dynamic linker (`dyld`) provides a detailed error message when the system prevents code from loading due to library validation. Use the Disable Library Validation Entitlement if your program loads plug-ins that are signed by other third-party developers.

To add this entitlement to your app, first enable the Hardened Runtime capability in Xcode, and then under Runtime Exceptions, select Disable Library Validation.

> [Important]  Because library validation is such an important security-hardening feature, Gatekeeper runs extra security checks on programs that have it disabled. If your program is blocked by Gatekeeper, check whether you’ve unnecessarily disabled library validation.

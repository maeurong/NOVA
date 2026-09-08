# Hardened Runtime



## Overview

The Hardened Runtime, along with System Integrity Protection (SIP), protects the runtime integrity of your software by preventing certain classes of exploits, like code injection, dynamically linked library (DLL) hijacking, and process memory space tampering. To enable the Hardened Runtime for your app, navigate in Xcode to your target’s Signing & Capabilities information and click the + button. In the window that appears, choose Hardened Runtime.

[img]

The Hardened Runtime doesn’t affect the operation of most apps, but it does disallow certain less common capabilities, like just-in-time (JIT) compilation. If your app relies on a capability that the Hardened Runtime restricts, add an entitlement to disable an individual protection. You add an entitlement by enabling one of the runtime exceptions or access permissions listed in Xcode. Make sure to use only the entitlements that are absolutely necessary for your app’s functionality.

[img]

You add entitlements only to executables. Shared libraries, frameworks, and in-process plug-ins inherit the entitlements of their host executable.

Due to their privileged position in the system, macOS refuses to load system extensions that use Hardened Runtime exception entitlements.  There’s one exception to this general rule: macOS allows the Allow execution of JIT-compiled code entitlement in non-DEXT system extensions.

The default value of these Boolean entitlements is false. When Xcode signs your code, it includes an entitlement only if the value is true. If you’re manually signing code, follow this convention to ensure maximum compatibility. Don’t include an entitlement if the value is false.

> [Important]  To upload a macOS app to be notarized, you must enable the Hardened Runtime capability. For more information about notarization, see Notarizing macOS software before distribution.

## Runtime Exceptions
- Allow execution of JIT-compiled code entitlement — A Boolean value that indicates whether the app may create writable and executable memory using the `MAP_JIT` flag. (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.cs.allow-jit)
- Allow Unsigned Executable Memory Entitlement — A Boolean value that indicates whether the app may create writable and executable memory without the restrictions imposed by using the `MAP_JIT` flag. (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.cs.allow-unsigned-executable-memory)
- Allow DYLD environment variables entitlement — A Boolean value that indicates whether the app may be affected by dynamic linker environment variables, which you can use to inject code into your app’s process. (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.cs.allow-dyld-environment-variables)
- Disable Library Validation Entitlement — A Boolean value that indicates whether the app loads arbitrary plug-ins or frameworks, without requiring code signing. (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.cs.disable-library-validation)
- Disable Executable Memory Protection Entitlement — A Boolean value that indicates whether to disable all code signing protections while launching an app, and during its execution. (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.cs.disable-executable-page-protection)
- Debugging tool entitlement — A Boolean value that indicates whether the app is a debugger and may attach to other processes or get task ports. (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.cs.debugger)

## Resource Access
- Audio Input Entitlement — A Boolean value that indicates whether the app may record audio using the built-in microphone and access audio input using Core Audio. (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.device.audio-input)
- Camera entitlement — A Boolean value that indicates whether the app may interact with the built-in and external cameras, and capture movies and still images. (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.device.camera)
- Location entitlement — A Boolean value that indicates whether the app may access location information from Location Services. (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.personal-information.location)
- Address book entitlement — A Boolean value that indicates whether the app may have read-write access to contacts in the user’s address book. (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.personal-information.addressbook)
- Calendars entitlement — A Boolean value that indicates whether the app may have read-write access to the user’s calendar. (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.personal-information.calendars)
- Photos Library Entitlement — A Boolean value that indicates whether the app has read-write access to the user’s Photos library. (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.personal-information.photos-library)
- Apple Events Entitlement — A Boolean value that indicates whether the app may prompt the user for permission to send Apple events to other apps. (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.automation.apple-events)

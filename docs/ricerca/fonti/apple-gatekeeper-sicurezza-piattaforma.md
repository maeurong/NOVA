macOS offers the Gatekeeper technology and runtime protection to help ensure that only trusted software runs on a user’s Mac.

## Gatekeeper

macOS includes a security technology called *Gatekeeper*, which is designed to help ensure that only trusted software runs on a user’s Mac. When a user downloads and opens an app, a plug-in, or an installer package from outside the App Store, Gatekeeper verifies that the software is from an identified developer, is notarized by Apple to be free of known malicious content, and hasn’t been altered. Gatekeeper also requests user approval before opening downloaded software for the first time to make sure the user hasn’t been tricked into running executable code they believed to simply be a data file. Gatekeeper also tracks the provenance of files written by downloaded software.

By default, Gatekeeper helps ensure that all downloaded software has been signed by the App Store or signed by a registered developer and notarized by Apple. Both the App Store review process and the notarization pipeline are designed to ensure that apps contain no known malware. Therefore by default, *all software in macOS is checked for known malicious content the first time it’s opened, regardless of how it arrived on the Mac*.

Users and organizations have the option to allow only software installed from the App Store. Alternatively, users can override Gatekeeper policies to open any software unless restricted by a [device management service](https://support.apple.com/guide/security/aside/sec1a32cff88/1/web/1). This includes allowing software signed with alternate identities. Gatekeeper can also be completely turned off, if necessary.

Gatekeeper also protects against the distribution of malicious plug-ins with benign apps. Here, using the app triggers the loading of a malicious plug-in without the user’s knowledge. When necessary, Gatekeeper opens apps from randomized, read-only locations. This is designed to prevent the automatic loading of plug-ins distributed alongside the app.

## Runtime protection

System files, resources, and the kernel are shielded from a user’s app space. All apps from the App Store are sandboxed to restrict access to data stored by other apps. If an app from the App Store needs to access data from another app, it can do so only by using the APIs and services provided by macOS.

Thanks for your feedback.

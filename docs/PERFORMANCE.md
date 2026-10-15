# Performance

## iOS application size

Measured on October 14, 2026 from an unsigned, optimized Release build for a
generic arm64 iOS device. The measurements reflect the project as it existed at
that time.

| Component                                   |                         Size |
| ------------------------------------------- | ---------------------------: |
| Installed app bundle (logical file size)    | 40.25 MiB (42,203,281 bytes) |
| Download size estimate (compressed app ZIP) | 11.24 MiB (11,789,610 bytes) |
| JavaScript bundle (`main.jsbundle`)         |   3.14 MiB (3,288,340 bytes) |
| Native application binary (`Doggo`)         |   7.39 MiB (7,752,192 bytes) |
| Embedded frameworks                         | 29.70 MiB (31,145,534 bytes) |
| Images and assets                           |       5.39 KiB (5,518 bytes) |
| Fonts                                       |                      0 bytes |

The shipped image assets were 13 React Navigation PNG icons. No font files were
packaged in the application.

### Largest embedded frameworks

| Framework               |      Size |
| ----------------------- | --------: |
| React                   | 11.16 MiB |
| Hermes                  |  5.66 MiB |
| libavif                 |  3.79 MiB |
| ExpoModulesCore         |  3.43 MiB |
| ReactNativeDependencies |  1.18 MiB |
| ExpoModulesJSI          |  1.11 MiB |
| ExpoFileSystem          |   997 KiB |
| SDWebImage              |   829 KiB |
| ExpoImage               |   612 KiB |

### Measurement process

1. Create an isolated unsigned Release build for a physical iOS device:

   ```bash
   BUILD_DIR=$(mktemp -d /tmp/doggo-size-build.XXXXXX)

   xcodebuild \
     -workspace ios/Doggo.xcworkspace \
     -scheme Doggo \
     -configuration Release \
     -sdk iphoneos \
     -destination 'generic/platform=iOS' \
     -derivedDataPath "$BUILD_DIR" \
     CODE_SIGNING_ALLOWED=NO \
     COMPILER_INDEX_STORE_ENABLE=NO \
     build

   APP="$BUILD_DIR/Build/Products/Release-iphoneos/Doggo.app"
   ```

2. Sum all files in the unpacked `.app` for the installed size:

   ```bash
   find "$APP" -type f -exec stat -f '%z' {} + |
     awk '{ total += $1 } END { print total }'
   ```

3. Compress the `.app` for an IPA-like download estimate:

   ```bash
   ditto -c -k --sequesterRsrc "$APP" /tmp/Doggo-release.zip
   stat -f '%z' /tmp/Doggo-release.zip
   ```

4. Measure the JavaScript bundle and native executable directly:

   ```bash
   stat -f '%z' "$APP/main.jsbundle"
   stat -f '%z' "$APP/Doggo"
   ```

5. Sum the files under `Frameworks`, then scan the final application bundle for
   packaged images, compiled asset catalogs, and fonts:

   ```bash
   find "$APP/Frameworks" -type f -exec stat -f '%z' {} + |
     awk '{ total += $1 } END { print total }'

   find "$APP" -type f \
     \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \
     -o -iname '*.gif' -o -iname '*.webp' -o -iname '*.heic' \
     -o -iname '*.avif' -o -iname '*.svg' -o -name 'Assets.car' \) \
     -exec stat -f '%z' {} +

   find "$APP" -type f \
     \( -iname '*.ttf' -o -iname '*.otf' \
     -o -iname '*.woff' -o -iname '*.woff2' \) \
     -exec stat -f '%z' {} +
   ```

The compressed download size is an estimate, not the final App Store value.
Apple's signing, encryption, processing, and device-specific thinning can change
both download and installed sizes. Authoritative per-device values require a
signed archive uploaded to App Store Connect.

## React Native development profile

Measured on the iPhone 17 Pro simulator by scrolling through all 283 breeds with
IDB while React Native's Performance Monitor and React Profiler were enabled.

| Result                 |     Value |
| ---------------------- | --------: |
| UI FPS                 |        60 |
| JS FPS                 |        60 |
| RAM                    | 452.64 MB |
| React Profiler commits |       617 |

- [Performance Monitor overlay](screenshots/react-native-perf-overlay.png)
- [React Profiler](screenshots/react-native-profiler-full-list.jpg)

These are development-build diagnostics and are not directly comparable with
Release-build measurements.

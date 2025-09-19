# Synthea Setup Instructions

The Synthea JAR file is required but not included in this repository due to its large size (170MB).

## Download Instructions

1. Download the latest Synthea release from:
   https://github.com/synthetichealth/synthea/releases

2. Look for `synthea-with-dependencies.jar` in the release assets

3. Place the JAR file in: `backend/synthea/synthea-with-dependencies.jar`

## Alternative: Build from source

```bash
git clone https://github.com/synthetichealth/synthea.git
cd synthea
./gradlew build
cp build/libs/synthea-with-dependencies.jar /path/to/synthea-studio/backend/synthea/
```

The application will not be able to generate populations without this JAR file.
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val cubismCore: File? = listOf(
    file("libs/Live2DCubismCore.aar"),
    file("${rootProject.projectDir}/live2d/Core/android/Live2DCubismCore.aar"),
).firstOrNull { it.isFile }

val cubismFrameworkSrc: File? = listOf(
    file("${rootProject.projectDir}/live2d/Framework/framework/src/main/java"),
    file("${rootProject.projectDir}/live2d/Framework/src/main/java"),
).firstOrNull { it.isDirectory }

val live2dSdkReady = cubismCore != null && cubismFrameworkSrc != null
val live2dFlagOn = System.getenv("TOUYA_LIVE2D") == "1" ||
    project.findProperty("touya.live2d")?.toString().equals("true", ignoreCase = true)

val live2dSampleAssets: List<File> = listOf(
    file("${rootProject.projectDir}/live2d/samples"),
    file("${rootProject.projectDir}/live2d/Sample/src/main/assets"),
).filter { it.isDirectory }

android {
    namespace = "jp.touya.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "jp.touya.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        // Emulator loopback to the host Next.js API. Device on LAN: change to the PC IP.
        buildConfigField("String", "API_BASE_URL", "\"https://touya.onrender.com\"")
        // Cubism Java is optional. Personal machines without Core still compile.
        buildConfigField("boolean", "LIVE2D_SDK_PRESENT", "$live2dSdkReady")
        buildConfigField("boolean", "LIVE2D_ENABLED", "$live2dFlagOn")
    }

    sourceSets {
        getByName("main") {
            java.srcDir(if (live2dSdkReady) "src/live2d/java" else "src/live2dStub/java")
            cubismFrameworkSrc?.let { java.srcDir(it) }
            live2dSampleAssets.forEach { assets.srcDir(it) }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    cubismCore?.let { implementation(files(it)) }
    val composeBom = platform("androidx.compose:compose-bom:2024.10.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("io.coil-kt:coil-compose:2.7.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
}

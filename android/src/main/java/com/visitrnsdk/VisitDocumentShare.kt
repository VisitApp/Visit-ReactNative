package com.visitrnsdk

import android.app.Activity
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.TimeUnit

internal class VisitDocumentProvider : FileProvider()

internal class VisitDocumentShare(private val context: Context) {
  fun download(link: String, authToken: String?): Pair<File, String> {
    var url = URL(link)
    var token = authToken?.takeIf { url.protocol == "https" && !isAws(url) }
    repeat(6) {
      require(url.protocol in setOf("http", "https") && url.userInfo == null)
      val connection = url.openConnection() as HttpURLConnection
      try {
        connection.instanceFollowRedirects = false
        connection.connectTimeout = 15000
        connection.readTimeout = 30000
        token?.let { connection.setRequestProperty("Authorization", it) }
        val status = connection.responseCode
        if (status in setOf(301, 302, 303, 307, 308)) {
          val redirect = URL(url, requireNotNull(connection.getHeaderField("Location")))
          if (!sameOrigin(url, redirect) || isAws(redirect)) token = null
          url = redirect
        } else {
          check(status in 200..299)
          val mimeType = connection.contentType?.substringBefore(';') ?: "application/octet-stream"
          val directory = createShareDirectory()
          try {
            val filename = Uri.parse(url.toString()).lastPathSegment.orEmpty()
              .replace(Regex("[^a-zA-Z0-9._ -]"), "_")
              .trim('.', ' ')
              .take(150)
              .ifBlank { "document" }
            val extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType)
            val file = File(directory, if ('.' in filename || extension == null) filename else "$filename.$extension")
            connection.inputStream.use { input -> file.outputStream().use { input.copyTo(it) } }
            return file to mimeType
          } catch (error: Exception) {
            directory.deleteRecursively()
            throw error
          }
        }
      } finally {
        connection.disconnect()
      }
    }
    error("The document exceeded the redirect limit")
  }

  fun share(activity: Activity, file: File, mimeType: String) {
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.visit_rn_sdk.fileprovider", file)
    val intent = Intent(Intent.ACTION_SEND).apply {
      type = mimeType
      putExtra(Intent.EXTRA_STREAM, uri)
      clipData = ClipData.newUri(context.contentResolver, file.name, uri)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    activity.startActivity(Intent.createChooser(intent, null))
  }

  private fun createShareDirectory(): File {
    val root = File(context.cacheDir, "visit-rn-sdk-documents")
    val expiry = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(1)
    root.listFiles()?.filter { it.lastModified() < expiry }?.forEach { it.deleteRecursively() }
    return File(root, UUID.randomUUID().toString()).also { check(it.mkdirs()) }
  }

  private fun isAws(url: URL): Boolean =
    url.host.equals("amazonaws.com", ignoreCase = true) ||
      url.host.endsWith(".amazonaws.com", ignoreCase = true)

  private fun sameOrigin(first: URL, second: URL): Boolean =
    first.protocol == second.protocol && first.host.equals(second.host, ignoreCase = true) &&
      (if (first.port == -1) first.defaultPort else first.port) ==
      (if (second.port == -1) second.defaultPort else second.port)
}

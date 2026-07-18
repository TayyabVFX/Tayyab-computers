$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$($port)/")
$listener.Prefixes.Add("http://127.0.0.1:$($port)/")

# ============================================
# Supabase Configuration
# ============================================
$supabaseUrl = "https://cqefgloiprzmvsjwtkrr.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZWZnbG9pcHJ6bXZzand0a3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTAzNzEsImV4cCI6MjA5OTg4NjM3MX0.Om_5sqI_9iwlE_JukIWe486yOl7nB8ZFWqB4TtvE_I4"

Write-Host "=================================================="
Write-Host "          TAYYAB STORE LOCAL WEB SERVER           "
Write-Host "    With Push Notification API Support            "
Write-Host "=================================================="

try {
    $listener.Start()
} catch {
    Write-Error "Failed to start local web server: $($_.Exception.Message)"
    Write-Host "Please ensure port $($port) is not already in use."
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

Write-Host "Web server is running successfully!"
Write-Host ""
Write-Host "  -> Local access:   http://localhost:$($port)/"
Write-Host "  -> Admin panel:    http://localhost:$($port)/admin"
Write-Host ""
Write-Host "Press Ctrl+C in this window to stop the server."
Write-Host "=================================================="
Write-Host "Request Log:"

# Map file extensions to MIME types
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".txt"  = "text/plain; charset=utf-8"
    ".webp" = "image/webp"
    ".woff2" = "font/woff2"
    ".woff" = "font/woff"
}

# ============================================
# Helper: Supabase REST API call
# ============================================
function Invoke-Supabase {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [string]$Body = $null,
        [hashtable]$ExtraHeaders = @{}
    )
    $headers = @{
        "apikey"        = $supabaseKey
        "Authorization" = "Bearer $supabaseKey"
        "Content-Type"  = "application/json"
        "Prefer"        = "return=representation"
    }
    foreach ($k in $ExtraHeaders.Keys) { $headers[$k] = $ExtraHeaders[$k] }
    
    $uri = "$supabaseUrl/rest/v1/$Endpoint"
    $params = @{
        Uri     = $uri
        Method  = $Method
        Headers = $headers
        UseBasicParsing = $true
    }
    if ($Body) { $params.Body = [System.Text.Encoding]::UTF8.GetBytes($Body) }
    
    try {
        $resp = Invoke-WebRequest @params
        return $resp.Content | ConvertFrom-Json
    } catch {
        Write-Host "  [Supabase Error] $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# ============================================
# Helper: Base64 URL encode/decode
# ============================================
function ConvertTo-Base64Url([byte[]]$bytes) {
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function ConvertFrom-Base64Url($s) {
    if ($null -eq $s) { return $null }
    # Handle if input is a PSCustomObject/hashtable by converting to string
    $str = $s.ToString().Trim().Replace('-', '+').Replace('_', '/')
    $str = $str.TrimEnd('=')
    switch ($str.Length % 4) {
        2 { $str += '==' }
        3 { $str += '=' }
    }
    return [Convert]::FromBase64String($str)
}

# ============================================
# Web Push: VAPID JWT + ECDH Encryption
# ============================================
# ============================================
# Web Push: VAPID JWT generation using CNG keys
# ============================================
function Import-EccPrivateKey($xB64, $yB64, $dB64) {
    try {
        $xBytes = ConvertFrom-Base64Url $xB64
        $yBytes = ConvertFrom-Base64Url $yB64
        $dBytes = ConvertFrom-Base64Url $dB64
        
        $blob = New-Object byte[] 104
        $blob[0] = 0x45; $blob[1] = 0x43; $blob[2] = 0x53; $blob[3] = 0x32
        $blob[4] = 0x20; $blob[5] = 0x00; $blob[6] = 0x00; $blob[7] = 0x00
        
        [Array]::Copy($xBytes, 0, $blob, 8, 32)
        [Array]::Copy($yBytes, 0, $blob, 40, 32)
        [Array]::Copy($dBytes, 0, $blob, 72, 32)
        
        $format = [System.Security.Cryptography.CngKeyBlobFormat]::EccPrivateBlob
        $cngKey = [System.Security.Cryptography.CngKey]::Import($blob, $format)
        return New-Object System.Security.Cryptography.ECDsaCng($cngKey)
    } catch {
        Write-Host "  [API] CNG private key import failed: $_" -ForegroundColor Red
        return $null
    }
}

function New-VapidAuthHeaders {
    param(
        [string]$Audience,
        [string]$Subject,
        $ecdsa,
        [string]$vapidPublicKey
    )
    
    $header = '{"typ":"JWT","alg":"ES256"}'
    $exp = [int][double]::Parse(([DateTimeOffset]::UtcNow.AddHours(12).ToUnixTimeSeconds()).ToString())
    $payload = "{`"aud`":`"$Audience`",`"exp`":$exp,`"sub`":`"$Subject`"}"
    
    $headerB64 = ConvertTo-Base64Url ([System.Text.Encoding]::UTF8.GetBytes($header))
    $payloadB64 = ConvertTo-Base64Url ([System.Text.Encoding]::UTF8.GetBytes($payload))
    $signingInput = [System.Text.Encoding]::ASCII.GetBytes("$headerB64.$payloadB64")
    
    $sigBytes = $ecdsa.SignData($signingInput, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
    $sigB64 = ConvertTo-Base64Url $sigBytes
    $jwt = "$headerB64.$payloadB64.$sigB64"
    
    return @{
        Authorization = "vapid t=$jwt, k=$vapidPublicKey"
    }
}

# ============================================
# API: Handle POST /api/send-notification
# ============================================
function Handle-SendNotification {
    param($request, $response)
    
    $response.ContentType = "application/json; charset=utf-8"
    $response.AddHeader("Access-Control-Allow-Origin", "*")
    
    # Read POST body
    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
    $bodyText = $reader.ReadToEnd()
    $reader.Close()
    
    Write-Host "  [API] Received notification request" -ForegroundColor Cyan
    
    try {
        $bodyObj = $bodyText | ConvertFrom-Json
    } catch {
        $errJson = '{"error":"Invalid JSON body"}'
        $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
        $response.StatusCode = 400
        $response.ContentLength64 = $errBytes.Length
        $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        return
    }
    
    $title = if ($bodyObj.title) { $bodyObj.title } else { "Store by Tayyab" }
    $body = if ($bodyObj.body) { $bodyObj.body } else { "New arrivals are now available!" }
    $image = if ($bodyObj.image) { $bodyObj.image } else { $null }
    $link = if ($bodyObj.link) { $bodyObj.link } else { "/" }
    
    # 1. Get VAPID settings from Supabase
    Write-Host "  [API] Loading VAPID keys from Supabase..." -ForegroundColor Gray
    $settings = Invoke-Supabase "orders?customerName=eq.__notification_settings__&limit=1"
    
    if (-not $settings -or $settings.Count -eq 0) {
        $errJson = '{"error":"VAPID keys not found in database. Open your site first to generate them."}'
        $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
        $response.StatusCode = 500
        $response.ContentLength64 = $errBytes.Length
        $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        return
    }
    
    $vapidSettings = $settings[0].address | ConvertFrom-Json
    $vapidPublicKey = $vapidSettings.publicKey
    $vapidPrivateKey = $vapidSettings.privateKey
    
    # Import private key using CNG parameters from JWK
    $ecdsa = Import-EccPrivateKey -xB64 $vapidPrivateKey.x -yB64 $vapidPrivateKey.y -dB64 $vapidPrivateKey.d
    if ($null -eq $ecdsa) {
        $errJson = '{"error":"Failed to import VAPID keys locally on this computer"}'
        $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
        $response.StatusCode = 500
        $response.ContentLength64 = $errBytes.Length
        $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        return
    }
    
    Write-Host "  [API] VAPID keys loaded successfully" -ForegroundColor Green
    
    # 2. Save notification payload to Supabase
    Write-Host "  [API] Saving notification payload..." -ForegroundColor Gray
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $payloadObj = @{ title = $title; body = $body; image = $image; link = $link; timestamp = $timestamp }
    $payloadJson = $payloadObj | ConvertTo-Json -Compress
    
    $existingPayload = Invoke-Supabase "orders?customerName=eq.__notification_payload__&select=id&limit=1"
    
    $dbPayload = @{
        customerName = "__notification_payload__"
        address = $payloadJson
        whatsapp = "payload"
        productId = "0"
        productName = "payload"
        qty = 1
        total = 0
    } | ConvertTo-Json -Compress
    
    if ($existingPayload -and $existingPayload.Count -gt 0) {
        $payloadId = $existingPayload[0].id
        $null = Invoke-Supabase "orders?id=eq.$payloadId" "PATCH" $dbPayload
    } else {
        $null = Invoke-Supabase "orders" "POST" $dbPayload
    }
    
    Write-Host "  [API] Payload saved" -ForegroundColor Green
    
    # 3. Get all subscribers
    Write-Host "  [API] Fetching subscribers..." -ForegroundColor Gray
    $subscribers = Invoke-Supabase "orders?customerName=eq.__notification_subscription__"
    
    if (-not $subscribers -or $subscribers.Count -eq 0) {
        $respJson = '{"message":"No subscribers to notify","results":[]}'
        $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
        $response.StatusCode = 200
        $response.ContentLength64 = $respBytes.Length
        $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
        return
    }
    
    Write-Host "  [API] Found $($subscribers.Count) subscriber(s)" -ForegroundColor Green
    
    # 4. Send push notification to each subscriber
    $results = @()
    
    foreach ($sub in $subscribers) {
        try {
            $subscription = $sub.address | ConvertFrom-Json
            $endpoint = $subscription.endpoint
            
            # Parse endpoint URL to get audience
            $endpointUri = [Uri]$endpoint
            $audience = "$($endpointUri.Scheme)://$($endpointUri.Host)"
            
            Write-Host "  [API] Sending to: $($endpoint.Substring(0, [Math]::Min(60, $endpoint.Length)))..." -ForegroundColor Gray
            
            # Generate VAPID auth header
            $vapidHeaders = New-VapidAuthHeaders -Audience $audience -Subject "mailto:tayyabvfx@gmail.com" -ecdsa $ecdsa -vapidPublicKey $vapidPublicKey
            
            # Send push tickle with empty body. Browser service worker fetches payload dynamically.
            $pushHeaders = @{
                "Authorization" = $vapidHeaders.Authorization
                "TTL" = "86400"
            }
            
            $emptyBody = New-Object byte[] 0
            $pushResp = Invoke-WebRequest -Uri $endpoint -Method Post -Body $emptyBody -ContentType "application/octet-stream" -Headers $pushHeaders -UseBasicParsing
            
            if ($pushResp.StatusCode -eq 201 -or $pushResp.StatusCode -eq 200) {
                Write-Host "  [API]   -> SUCCESS" -ForegroundColor Green
                $results += @{ endpoint = $endpoint; status = "success" }
            } else {
                Write-Host "  [API]   -> Failed: HTTP $($pushResp.StatusCode)" -ForegroundColor Yellow
                $results += @{ endpoint = $endpoint; status = "failed"; error = "HTTP $($pushResp.StatusCode)" }
            }
        } catch {
            $errMsg = $_.Exception.Message
            $statusCode = $null
            if ($_.Exception.Response) {
                $statusCode = [int]$_.Exception.Response.StatusCode
            }
            
            if ($statusCode -eq 410 -or $statusCode -eq 404) {
                Write-Host "  [API]   -> Expired subscription, removing..." -ForegroundColor Yellow
                $null = Invoke-Supabase "orders?id=eq.$($sub.id)" "DELETE"
                $results += @{ endpoint = "expired"; status = "expired" }
            } else {
                Write-Host "  [API]   -> Error: $errMsg" -ForegroundColor Red
                $results += @{ endpoint = "failed"; status = "failed"; error = $errMsg }
            }
        }
    }
    
    $successCount = ($results | Where-Object { $_.status -eq "success" }).Count
    $failedCount = ($results | Where-Object { $_.status -ne "success" }).Count
    
    $respObj = @{
        message = "Sent to $successCount subscribers, $failedCount failed"
        results = $results
    }
    $respJson = $respObj | ConvertTo-Json -Compress -Depth 3
    $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
    
    $response.StatusCode = 200
    $response.ContentLength64 = $respBytes.Length
    $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
    
    Write-Host "  [API] Done! $successCount sent, $failedCount failed" -ForegroundColor $(if ($successCount -gt 0) { "Green" } else { "Yellow" })
}

# ============================================
# Main event loop
# ============================================
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath
        $cleanPath = $urlPath.Trim('/')

        # Standard logging format
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $($request.HttpMethod) $($request.Url.PathAndQuery)"

        # ======== API ROUTES ========
        if ($cleanPath -eq "api/send-notification") {
            # Handle CORS preflight
            if ($request.HttpMethod -eq "OPTIONS") {
                $response.AddHeader("Access-Control-Allow-Origin", "*")
                $response.AddHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
                $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
                $response.StatusCode = 200
                $response.Close()
                continue
            }
            
            if ($request.HttpMethod -eq "POST") {
                try {
                    Handle-SendNotification $request $response
                } catch {
                    Write-Host "  [API] Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
                    $errJson = "{`"error`":`"Server error: $($_.Exception.Message -replace '"','\"')`"}"
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                    $response.StatusCode = 500
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $errBytes.Length
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
                $response.Close()
                continue
            }
        }
        
        # ======== STATIC FILE ROUTES ========
        # Prevent directory traversal attacks
        if ($urlPath -like "*..*") {
            $response.StatusCode = 400
            $response.Close()
            continue
        }

        $targetFile = ""
        $redirectUrl = ""

        if ($cleanPath -eq "") {
            $targetFile = "index.html"
        } else {
            # Match known static pages
            $knownPages = @("admin", "index", "product", "checkout")
            if ($knownPages -contains $cleanPath) {
                $targetFile = "$cleanPath.html"
            } else {
                # Check for extensions
                $ext = [System.IO.Path]::GetExtension($cleanPath)
                if ($ext -ne "") {
                    $targetFile = $cleanPath
                } else {
                    # Treat unknown paths as product slug rewrites (redirect for routing)
                    $redirectUrl = "/product.html?slug=" + [Uri]::EscapeDataString($cleanPath)
                }
            }
        }

        if ($redirectUrl -ne "") {
            $response.StatusCode = 302
            $response.RedirectLocation = $redirectUrl
            $response.Close()
            continue
        }

        $fullPath = Join-Path $PSScriptRoot $targetFile

        if (Test-Path $fullPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $contentType = $mimeTypes[$ext]
            if ($null -eq $contentType) { $contentType = "application/octet-stream" }

            $response.ContentType = $contentType
            $response.StatusCode = 200

            try {
                $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                $response.ContentLength64 = $bytes.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } catch {
                Write-Host "  Error serving $($targetFile) : $($_.Exception.Message)" -ForegroundColor Red
                $response.StatusCode = 500
            }
        } else {
            Write-Host "  File Not Found: $($targetFile)" -ForegroundColor Yellow
            $response.StatusCode = 404
            $html404 = "<html><body><h1>404 Not Found</h1><p>The requested file could not be found: $($targetFile)</p></body></html>"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($html404)
            $response.ContentType = "text/html; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        }

        $response.Close()
    }
} catch {
    Write-Host "Server stopped: $($_.Exception.Message)"
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}
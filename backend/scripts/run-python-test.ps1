# Helper script to start the backend and exercise the run endpoint without quoting issues
param (
    [string]$Language = "python",
    [string]$Code = "print('Hello from Python')",
    [string]$CodePath,
    [string]$CodeBase64,
    [string]$Stdin = "",
    [string]$StdinPath,
    [string]$StdinBase64,
    [string]$Token,
    [string]$AuthEmail = "runner@example.com",
    [securestring]$AuthPassword = (ConvertTo-SecureString "Runner123!" -AsPlainText -Force),
    [bool]$RegisterIfNeeded = $true
)

$pipelineBuffer = @()
foreach ($chunk in $input) {
    if ($null -ne $chunk) {
        $pipelineBuffer += $chunk
    }
}

function Resolve-Content {
    param (
        [string]$Inline,
        [bool]$InlineWasProvided,
        [string]$Path,
        [string]$Base64,
        [string[]]$PipelineInput,
        [string]$Name,
        [switch]$AllowEmpty
    )

    # Resolve content from the most explicit source available so callers can avoid complex quoting.
    if ($Path) {
        if (-not (Test-Path -LiteralPath $Path)) {
            throw "${Name} path '$Path' does not exist."
        }

        return Get-Content -LiteralPath $Path -Raw
    }

    if ($Base64) {
        try {
            $bytes = [System.Convert]::FromBase64String($Base64)
            return [System.Text.Encoding]::UTF8.GetString($bytes)
        } catch {
            throw "${Name} base64 data is invalid: $($_.Exception.Message)"
        }
    }

    if ($PipelineInput -and $PipelineInput.Count -gt 0) {
        return ($PipelineInput -join [Environment]::NewLine)
    }

    if ($InlineWasProvided -or $Inline) {
        return $Inline
    }

    if ($AllowEmpty) {
        return ""
    }

    return $null
}

function ConvertTo-PlainText {
    param (
        [securestring]$SecureString
    )

    if ($null -eq $SecureString) {
        return $null
    }

    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringUni($bstr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

function Get-AuthToken {
    param (
        [string]$ExistingToken,
        [string]$Email,
        [securestring]$Password,
        [bool]$AllowRegistration
    )

    if ($ExistingToken) {
        return $ExistingToken
    }

    if ([string]::IsNullOrWhiteSpace($Email) -or $null -eq $Password) {
        return $null
    }

    $baseUri = "http://localhost:$port"
    $passwordPlain = ConvertTo-PlainText -SecureString $Password
    if ([string]::IsNullOrEmpty($passwordPlain)) {
        return $null
    }
    $loginBody = @{ email = $Email; password = $passwordPlain } | ConvertTo-Json -Compress

    try {
        $loginResponse = Invoke-RestMethod -Uri "$baseUri/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
        Write-Output "Authenticated as ${Email} via login."
        return $loginResponse.token
    } catch {
        $shouldRegister = $AllowRegistration -and $_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 404

        if (-not $shouldRegister) {
            Write-Warning "Login failed for ${Email}: $($_.Exception.Message)"
            throw
        }

        Write-Output "Login failed for ${Email}, attempting registration..."

        $name = ($Email.Split('@')[0])
        if (-not $name) {
            $name = 'Runner'
        }

        $registerBody = @{ name = $name; email = $Email; password = $passwordPlain } | ConvertTo-Json -Compress

        try {
            $registerResponse = Invoke-RestMethod -Uri "$baseUri/api/auth/register" -Method Post -ContentType "application/json" -Body $registerBody
            Write-Output "Registered and authenticated as ${Email}."
            return $registerResponse.token
        } catch {
            Write-Warning "Registration failed for ${Email}: $($_.Exception.Message)"
            throw
        }
    }
}

$backendPath = "D:\Projects\codeide\codecraft-ide\backend"
$serverFile  = "server.js"
$port        = 5000
$maxRetries  = 10
$retryDelay  = 2  # seconds

function Start-BackendIfNeeded {
    $nodeProcess = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*$backendPath*" }

    if (-not $nodeProcess) {
        Write-Output "Starting backend server..."
        Start-Process -WorkingDirectory $backendPath -NoNewWindow -FilePath "node" -ArgumentList $serverFile
        Start-Sleep -Seconds 3
    } else {
        Write-Output "Backend already running."
    }
}

function Wait-ForBackendHealth {
    param (
        [int]$Port,
        [int]$MaxRetries,
        [int]$RetryDelay
    )

    $retry = 0
    while ($retry -lt $MaxRetries) {
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:$Port/health" -Method Get -TimeoutSec 2
            if ($health.status -eq "ok") {
                Write-Output "Backend is healthy: $($health | ConvertTo-Json -Compress)"
                return $true
            }
        } catch {
            Write-Output "Waiting for backend to start..."
            Start-Sleep -Seconds $RetryDelay
            $retry++
        }
    }

    return $false
}

function Invoke-CodeRun {
    param (
        [string]$Language,
        [string]$Code,
        [string]$Stdin,
        [string]$Token
    )

    if (-not $Code) {
        throw "Code snippet cannot be empty."
    }

    $payload = @{
        language = $Language
        code     = $Code
        stdin    = $Stdin
    } | ConvertTo-Json -Compress -Depth 6

    $headers = @{ 'Content-Type' = 'application/json' }
    if ($Token) {
        $headers['Authorization'] = "Bearer $Token"
    }

    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$port/api/run" -Method Post -Headers $headers -Body $payload
        Write-Output "Execution response: $($response | ConvertTo-Json -Compress)"
    } catch {
        Write-Error "Error sending code: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            $respStream = $_.Exception.Response.GetResponseStream()
            $sr = New-Object System.IO.StreamReader($respStream)
            Write-Output "Response body: $($sr.ReadToEnd())"
        }
    }
}

Start-BackendIfNeeded

if (-not (Wait-ForBackendHealth -Port $port -MaxRetries $maxRetries -RetryDelay $retryDelay)) {
    Write-Error "Backend did not respond on port $port. Exiting."
    exit 1
}

$codeParamProvided  = $PSBoundParameters.ContainsKey('Code')
$stdinParamProvided = $PSBoundParameters.ContainsKey('Stdin')

$codeContent = Resolve-Content -Inline $Code -InlineWasProvided $codeParamProvided -Path $CodePath -Base64 $CodeBase64 -PipelineInput $pipelineBuffer -Name "Code"

if (-not $codeContent) {
    throw "Code snippet cannot be empty. Provide -Code, -CodePath, -CodeBase64, or pipe content into the script."
}

$stdinContent = Resolve-Content -Inline $Stdin -InlineWasProvided $stdinParamProvided -Path $StdinPath -Base64 $StdinBase64 -PipelineInput @() -Name "Stdin" -AllowEmpty

$tokenValue = $null
try {
    $tokenValue = Get-AuthToken -ExistingToken $Token -Email $AuthEmail -Password $AuthPassword -AllowRegistration:$RegisterIfNeeded
} catch {
    Write-Error "Failed to resolve authentication: $($_.Exception.Message)"
    exit 1
}

if (-not $tokenValue) {
    Write-Warning "No auth token resolved. The request may be rejected if authentication is required."
}

Invoke-CodeRun -Language $Language -Code $codeContent -Stdin $stdinContent -Token $tokenValue

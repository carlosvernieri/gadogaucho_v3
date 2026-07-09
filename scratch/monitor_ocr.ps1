# Script para monitorar o OCR e desligar o computador após a conclusão
$proc = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object { $_.CommandLine -like "*leilao_processor_final.py*" }

if ($proc) {
    $ocrPid = $proc.ProcessId
    Write-Host "Processo OCR encontrado! PID: $ocrPid"
    Write-Host "Monitorando o script OCR... O monitor aguardará a finalização do processo."
    
    $processObject = Get-Process -Id $ocrPid -ErrorAction SilentlyContinue
    if ($processObject) {
        Wait-Process -Id $ocrPid
    }
    
    Write-Host "O script OCR terminou o processamento!"
    Write-Host "Aguardando 300 segundos (5 minutos) antes de iniciar o desligamento do computador..."
    
    # Contagem regressiva
    for ($i = 300; $i -gt 0; $i--) {
        if ($i % 30 -eq 0 -or $i -le 10) {
            Write-Host "Tempo restante para o desligamento: $i segundos..."
        }
        Start-Sleep -Seconds 1
    }
    
    Write-Host "Iniciando o desligamento do computador..."
    shutdown /s /f /t 60 /c "OCR concluido. O computador sera desligado em 60 segundos. Para cancelar, execute: shutdown /a"
} else {
    Write-Host "Nenhum processo ativo do script OCR (leilao_processor_final.py) foi encontrado."
    Write-Host "Certifique-se de que o OCR ja foi iniciado antes de rodar este monitor."
}

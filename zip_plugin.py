import shutil
import os

# Nome da pasta do plugin e do arquivo final
folder = "woocommerce-binance-pix"
zip_name = "Plugin-Binance-Pix"

# Caminho absoluto (para garantir que salva onde você está vendo)
base_path = r"c:\Users\thoma\OneDrive\Área de Trabalho\Pluguin -Woocomerc-Cripto-pix-usdt"
output_path = os.path.join(base_path, zip_name)
source_path = os.path.join(base_path, folder)

print(f"Compactando '{source_path}' para '{output_path}.zip'...")

try:
    shutil.make_archive(output_path, 'zip', root_dir=base_path, base_dir=folder)
    print("SUCESSO! Arquivo criado.")
except Exception as e:
    print(f"ERRO: {e}")


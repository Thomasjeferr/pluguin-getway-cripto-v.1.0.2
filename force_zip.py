import shutil
import os

# Caminhos
user_desktop = os.path.expanduser("~/Desktop")
project_root = r"c:\Users\thoma\OneDrive\Área de Trabalho\Pluguin -Woocomerc-Cripto-pix-usdt"
plugin_folder = os.path.join(project_root, "woocommerce-binance-pix")
output_filename = "PLUGIN_PRONTO_PRA_INSTALAR"
output_path = os.path.join(user_desktop, output_filename)

print(f"Compactando plugin de: {plugin_folder}")
print(f"Salvando em: {output_path}.zip")

try:
    shutil.make_archive(output_path, 'zip', root_dir=project_root, base_dir="woocommerce-binance-pix")
    print("SUCESSO! Verifique sua Área de Trabalho.")
except Exception as e:
    print(f"ERRO FATAL: {e}")


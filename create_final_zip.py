import shutil
import os

# Caminho atual onde estamos trabalhando
current_dir = os.getcwd()
plugin_folder = "woocommerce-binance-pix"
zip_name = "Plugin-Binance-Pix-FINAL"

output_path = os.path.join(current_dir, zip_name)

print(f"Criando ZIP FINAL em: {output_path}.zip")

try:
    shutil.make_archive(output_path, 'zip', root_dir=current_dir, base_dir=plugin_folder)
    print("SUCESSO! Arquivo FINAL criado.")
except Exception as e:
    print(f"ERRO: {e}")


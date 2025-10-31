import pandas as pd

df = pd.read_csv('elementor-submissions-export-New Form (a6d5ea4)-2025-10-30.csv')
df.drop(columns=['User Agent', 'User IP','User ID', 'Referrer', 'Form Name (ID)'], inplace=True)


order_columnas = ['Submission ID', 'Nombre', 'Email', 'Provincia', 'Created At']
df = df[order_columnas]
df.rename(columns={
    'Submission ID': 'id',
    'Nombre': 'nombre',
    'Email': 'email',
    'Provincia': 'provincia',
    'Created At': 'fecha_registro'
}, inplace=True)

df['email'] = df['email'].astype(str).str.strip().str.lower()
df = df.sort_values('fecha_registro').drop_duplicates(subset='email', keep='last')

df.to_csv('lista_espera_limpia.csv', index=False)


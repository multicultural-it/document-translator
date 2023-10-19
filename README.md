# document-translator

1. **Exporta la clave de la API**:

```bash
export OPENAI_API_KEY=<tu_key>
```

## Uso:

1. **Coloca tu archivo** en `documents/input/`.
2. **Ejecuta el programa** especificando el idioma:

```bash
node src/index.js [Idioma]
```

_Ejemplo:_

```bash
node src/index.js French
```

3. **Espera**.
4. **Encuentra** el archivo traducido en `documents/output/`.

## Notas:

- Asegúrate de que el archivo en `documents/input/` tenga el nombre `input` o verifica el código para el nombre correcto.

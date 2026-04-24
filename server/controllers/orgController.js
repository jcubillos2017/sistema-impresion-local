const { Direccion, Departamento, Subdepartamento, Seccion } = require('../models/Organization');
const { sequelize } = require('../config/database');

// 1. Obtener el Árbol Completo (Jerarquía anidada)
exports.getFullHierarchy = async (req, res) => {
    try {
        const data = await Direccion.findAll({
            include: [{
                model: Departamento,
                include: [{
                    model: Subdepartamento,
                    include: [{
                        model: Seccion
                    }]
                }]
            }]
        });
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener la jerarquía' });
    }
};

// 2. Crear Elementos (Genérico para simplificar código)
exports.createItem = async (req, res) => {
    try {
        const { type, nombre, parentId } = req.body;
        
        let newItem;
        if (type === 'direccion') {
            newItem = await Direccion.create({ nombre });
        } else if (type === 'departamento') {
            newItem = await Departamento.create({ nombre, direccion_id: parentId });
        } else if (type === 'subdepartamento') {
            newItem = await Subdepartamento.create({ nombre, departamento_id: parentId });
        } else if (type === 'seccion') {
            newItem = await Seccion.create({ nombre, subdepartamento_id: parentId });
        } else {
            return res.status(400).json({ message: 'Tipo de organización no válido' });
        }

        res.status(201).json({ message: 'Creado correctamente', item: newItem });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear el elemento' });
    }
};

// 3. Eliminar Elemento
exports.deleteItem = async (req, res) => {
    try {
        const { type, id } = req.params;
        let result;

        if (type === 'direccion') result = await Direccion.destroy({ where: { id } });
        else if (type === 'departamento') result = await Departamento.destroy({ where: { id } });
        else if (type === 'subdepartamento') result = await Subdepartamento.destroy({ where: { id } });
        else if (type === 'seccion') result = await Seccion.destroy({ where: { id } });

        if (!result) return res.status(404).json({ message: 'Elemento no encontrado' });

        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar' });
    }
};

// 3.5 Actualizar Elemento (Renombrar)
exports.updateItem = async (req, res) => {
    try {
        const { type, id } = req.params;
        const { nombre } = req.body;
        let result;

        if (type === 'direccion') result = await Direccion.update({ nombre }, { where: { id } });
        else if (type === 'departamento') result = await Departamento.update({ nombre }, { where: { id } });
        else if (type === 'subdepartamento') result = await Subdepartamento.update({ nombre }, { where: { id } });
        else if (type === 'seccion') result = await Seccion.update({ nombre }, { where: { id } });

        if (!result || result[0] === 0) return res.status(404).json({ message: 'Elemento no encontrado o sin cambios' });

        res.json({ message: 'Actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar' });
    }
};
// 4. Importación Masiva de Jerarquía (Excel)
exports.importOrgHierarchy = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const rawData = req.body; // Array con datos limpios desde el frontend
        let count = 0;

        for (const row of rawData) {
            // 1. Obtener valores
            const nombreServ = row['Servicio']?.trim(); 
            let nombreDir = row['Direccion']?.trim();
            let nombreDep = row['Departamento']?.trim();
            let nombreSub = row['Subdepartamento']?.trim();
            let nombreSec = row['Seccion']?.trim();
            const nombreUbi = row['Ubicacion']?.trim();

            if (!nombreDir) continue; // Sin dirección no podemos empezar

            // --- LÓGICA DE RELLENO AUTOMÁTICO (Auto-Fill) ---
            // Si hay Sección, pero faltan padres, los inventamos como "General"
            if (nombreSec) {
                if (!nombreSub) nombreSub = 'General';
                if (!nombreDep) nombreDep = 'General';
            }
            // Si hay Subdepartamento pero falta Departamento
            if (nombreSub) {
                if (!nombreDep) nombreDep = 'General';
            }
            // -------------------------------------------------

            // 1. Nivel Dirección (Siempre existe)
            const [dir] = await Direccion.findOrCreate({
                where: { nombre: nombreDir },
                defaults: { nombre: nombreDir },
                transaction
            });

            // 2. Nivel Departamento
            // Ahora siempre entra si había departamento O si lo forzamos como 'General'
            if (nombreDep) {
                const [dep] = await Departamento.findOrCreate({
                    where: { nombre: nombreDep, direccion_id: dir.id },
                    defaults: { nombre: nombreDep, direccion_id: dir.id },
                    transaction
                });

                // 3. Nivel Subdepartamento
                if (nombreSub) {
                    const [sub] = await Subdepartamento.findOrCreate({
                        where: { nombre: nombreSub, departamento_id: dep.id },
                        defaults: { nombre: nombreSub, departamento_id: dep.id },
                        transaction
                    });

                    // 4. Nivel Sección
                    if (nombreSec) {
                        const [sec, created] = await Seccion.findOrCreate({
                            where: { nombre: nombreSec, subdepartamento_id: sub.id },
                            defaults: { 
                                nombre: nombreSec, 
                                subdepartamento_id: sub.id,
                                ubicacion: nombreUbi 
                            },
                            transaction
                        });

                        // Actualizar ubicación si viene en el excel
                        if (!created && nombreUbi && sec.ubicacion !== nombreUbi) {
                            sec.ubicacion = nombreUbi;
                            await sec.save({ transaction });
                        }
                    }
                }
            }
            count++;
        }

        await transaction.commit();
        res.json({ message: `Jerarquía procesada. ${count} registros analizados.` });

    } catch (error) {
        await transaction.rollback();
        console.error("Error importación:", error);
        res.status(500).json({ message: 'Error en la importación masiva' });
    }
};


































































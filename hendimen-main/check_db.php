<?php
// check_db.php
require_once 'config.php';

header('Content-Type: application/json');

$result = [
    'database' => $database,
    'tables' => []
];

// Cek tabel users
$tables = ['users', 'jobs', 'transactions'];

foreach ($tables as $table) {
    $check = $conn->query("SHOW TABLES LIKE '$table'");
    if ($check->num_rows > 0) {
        // Ambil struktur tabel
        $columns = $conn->query("DESCRIBE $table");
        $cols = [];
        while ($col = $columns->fetch_assoc()) {
            $cols[] = $col['Field'] . ' (' . $col['Type'] . ')';
        }
        
        // Hitung jumlah data
        $count = $conn->query("SELECT COUNT(*) as total FROM $table")->fetch_assoc();
        
        $result['tables'][$table] = [
            'exists' => true,
            'columns' => $cols,
            'total_rows' => $count['total']
        ];
    } else {
        $result['tables'][$table] = [
            'exists' => false,
            'error' => 'Tabel tidak ditemukan'
        ];
    }
}

// Cek foreign key jika ada
$result['foreign_keys'] = [];
$fk_query = $conn->query("
    SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE REFERENCED_TABLE_SCHEMA = '$database'
");

if ($fk_query) {
    while ($fk = $fk_query->fetch_assoc()) {
        $result['foreign_keys'][] = $fk;
    }
}

echo json_encode($result, JSON_PRETTY_PRINT);
?>
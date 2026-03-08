<?php
// save_job.php
require_once 'config.php';

header('Content-Type: application/json');

error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method tidak diizinkan');
    }

    // Log untuk debugging
    error_log("Save job - POST data: " . print_r($_POST, true));

    $user_id = intval($_POST['user_id'] ?? 0);
    $title = trim($_POST['title'] ?? '');
    $category = trim($_POST['category'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $location = trim($_POST['location'] ?? '');
    $price = floatval($_POST['price'] ?? 0);
    $emergency = isset($_POST['emergency']) ? 1 : 0;

    // Validasi lengkap
    $errors = [];
    
    if ($user_id <= 0) $errors[] = "User ID tidak valid";
    if (empty($title)) $errors[] = "Judul harus diisi";
    if (empty($category)) $errors[] = "Kategori harus dipilih";
    if (empty($description)) $errors[] = "Deskripsi harus diisi";
    if (empty($location)) $errors[] = "Lokasi harus diisi";
    if ($price < 10000) $errors[] = "Minimal upah Rp 10.000";

    if (!empty($errors)) {
        throw new Exception(implode(", ", $errors));
    }

    // Cek saldo user
    $check_balance = $conn->prepare("SELECT wallet_balance FROM users WHERE id = ?");
    $check_balance->bind_param("i", $user_id);
    $check_balance->execute();
    $balance_result = $check_balance->get_result();
    
    if ($balance_result->num_rows === 0) {
        throw new Exception('User tidak ditemukan');
    }
    
    $user_balance = $balance_result->fetch_assoc()['wallet_balance'];
    $service_fee = 2500;

    if ($user_balance < $service_fee) {
        throw new Exception('Saldo tidak cukup untuk biaya layanan');
    }

    // Cek kolom helper_id
    $check_column = $conn->query("SHOW COLUMNS FROM jobs LIKE 'helper_id'");
    if ($check_column->num_rows === 0) {
        $conn->query("ALTER TABLE jobs ADD COLUMN helper_id INT NULL AFTER user_id");
    }

    // Mulai transaction
    $conn->begin_transaction();

    // Insert job
    $insert = $conn->prepare("INSERT INTO jobs (user_id, helper_id, title, category, description, location, price, emergency, status, distance) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'open', '0.5 km')");
    $insert->bind_param("issssdi", $user_id, $title, $category, $description, $location, $price, $emergency);
    
    if (!$insert->execute()) {
        throw new Exception('Gagal menyimpan pekerjaan: ' . $insert->error);
    }

    $job_id = $insert->insert_id;

    // Kurangi saldo
    $update_balance = $conn->prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?");
    $update_balance->bind_param("di", $service_fee, $user_id);
    
    if (!$update_balance->execute()) {
        throw new Exception('Gagal update saldo');
    }

    // Catat transaksi
    $trans_desc = "Biaya posting pekerjaan: " . $title;
    $insert_transaction = $conn->prepare("INSERT INTO transactions (user_id, amount, description, type, status) VALUES (?, ?, ?, 'fee', 'success')");
    $insert_transaction->bind_param("ids", $user_id, $service_fee, $trans_desc);
    
    if (!$insert_transaction->execute()) {
        throw new Exception('Gagal mencatat transaksi: ' . $insert_transaction->error);
    }

    // Ambil saldo baru
    $select_balance = $conn->prepare("SELECT wallet_balance FROM users WHERE id = ?");
    $select_balance->bind_param("i", $user_id);
    $select_balance->execute();
    $new_balance = $select_balance->get_result()->fetch_assoc()['wallet_balance'];

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Pekerjaan berhasil diposting',
        'job_id' => $job_id,
        'new_balance' => floatval($new_balance)
    ]);

} catch (Exception $e) {
    if (isset($conn)) $conn->rollback();
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($insert)) $insert->close();
    if (isset($check_balance)) $check_balance->close();
    if (isset($update_balance)) $update_balance->close();
    if (isset($insert_transaction)) $insert_transaction->close();
    if (isset($select_balance)) $select_balance->close();
    if (isset($conn)) $conn->close();
}
?>
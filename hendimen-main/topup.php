<?php
// topup.php
require_once 'config.php';

header('Content-Type: application/json');

// Aktifkan error reporting untuk debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method tidak diizinkan');
    }

    // Log data yang diterima
    error_log("Topup data: " . print_r($_POST, true));

    $user_id = intval($_POST['user_id'] ?? 0);
    $nominal = floatval($_POST['nominal'] ?? 0);
    $method = $_POST['method'] ?? '';

    if (!$user_id) {
        throw new Exception('User ID tidak valid');
    }

    if ($nominal < 10000) {
        throw new Exception('Nominal minimal Rp 10.000');
    }

    if (empty($method)) {
        throw new Exception('Pilih metode pembayaran');
    }

    // Cek apakah user ada
    $check_user = $conn->prepare("SELECT id FROM users WHERE id = ?");
    $check_user->bind_param("i", $user_id);
    $check_user->execute();
    $user_result = $check_user->get_result();
    
    if ($user_result->num_rows === 0) {
        throw new Exception('User tidak ditemukan');
    }
    $check_user->close();

    // Mulai transaction
    $conn->begin_transaction();

    // Update saldo user
    $update = $conn->prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?");
    $update->bind_param("di", $nominal, $user_id);
    
    if (!$update->execute()) {
        throw new Exception('Gagal update saldo: ' . $update->error);
    }

    if ($update->affected_rows === 0) {
        throw new Exception('Tidak ada perubahan saldo');
    }

    // Catat transaksi
    $desc = "Top Up via " . strtoupper(str_replace('_', ' ', $method));
    
    // Cek apakah tabel transactions ada
    $check_table = $conn->query("SHOW TABLES LIKE 'transactions'");
    if ($check_table->num_rows === 0) {
        // Buat tabel transactions jika belum ada
        $create_table = "CREATE TABLE IF NOT EXISTS transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            description VARCHAR(255) NOT NULL,
            type ENUM('topup', 'fee', 'payment', 'withdrawal') DEFAULT 'topup',
            status ENUM('pending', 'success', 'failed') DEFAULT 'success',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (user_id),
            INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        
        if (!$conn->query($create_table)) {
            throw new Exception('Gagal membuat tabel transactions: ' . $conn->error);
        }
    }

    $insert = $conn->prepare("INSERT INTO transactions (user_id, amount, description, type, status) VALUES (?, ?, ?, 'topup', 'success')");
    $insert->bind_param("ids", $user_id, $nominal, $desc);
    
    if (!$insert->execute()) {
        throw new Exception('Gagal mencatat transaksi: ' . $insert->error);
    }

    // Ambil saldo terbaru
    $select = $conn->prepare("SELECT wallet_balance FROM users WHERE id = ?");
    $select->bind_param("i", $user_id);
    $select->execute();
    $result = $select->get_result();
    $new_balance = $result->fetch_assoc()['wallet_balance'];

    // Commit transaction
    $conn->commit();

    // Format amount untuk ditampilkan
    $formatted_amount = '+Rp ' . number_format($nominal, 0, ',', '.');

    echo json_encode([
        'success' => true,
        'message' => 'Top up berhasil',
        'new_balance' => floatval($new_balance),
        'transaction' => [
            'date' => date('Y-m-d'),
            'desc' => $desc,
            'amount' => $formatted_amount,
            'status' => 'Sukses'
        ]
    ]);

} catch (Exception $e) {
    // Rollback jika ada error
    if (isset($conn)) {
        $conn->rollback();
    }
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($update)) $update->close();
    if (isset($insert)) $insert->close();
    if (isset($select)) $select->close();
    if (isset($conn)) $conn->close();
}
?>
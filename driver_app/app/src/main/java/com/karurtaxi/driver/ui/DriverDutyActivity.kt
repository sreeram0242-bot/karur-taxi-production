package com.karurtaxi.driver.ui

import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import com.karurtaxi.driver.R
import com.karurtaxi.driver.service.DriverLocationService
import com.karurtaxi.driver.util.OemBatteryOptimizationHelper

class DriverDutyActivity : AppCompatActivity() {

    private var isOnline = false
    private var driverId = "c0000001-0000-0000-0000-000000000001"
    private var walletBalance: Double = 450.00
    private var activeRideId: String? = null

    private lateinit var btnDutyToggle: Button
    private lateinit var tvDutyStatus: TextView
    private lateinit var tvWalletBalance: TextView
    private lateinit var cardWalletLock: View
    private lateinit var btnRechargeUpi: Button
    private lateinit var cardActiveRide: View
    private lateinit var btnArrived: Button
    private lateinit var btnEnterPin: Button
    private lateinit var btnCompleteTrip: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_driver_duty)

        btnDutyToggle = findViewById(R.id.btn_duty_toggle)
        tvDutyStatus = findViewById(R.id.tv_duty_status)
        tvWalletBalance = findViewById(R.id.tv_wallet_balance)
        cardWalletLock = findViewById(R.id.card_wallet_lock)
        btnRechargeUpi = findViewById(R.id.btn_recharge_upi)
        cardActiveRide = findViewById(R.id.card_active_ride)
        btnArrived = findViewById(R.id.btn_arrived)
        btnEnterPin = findViewById(R.id.btn_enter_pin)
        btnCompleteTrip = findViewById(R.id.btn_complete_trip)

        updateWalletUi()
        checkBatteryExemption()

        btnDutyToggle.setOnClickListener {
            toggleDuty()
        }

        btnRechargeUpi.setOnClickListener {
            launchUpiPayment()
        }

        btnArrived.setOnClickListener {
            onArrivedAtPickup()
        }

        btnEnterPin.setOnClickListener {
            showOtpKeypadModal()
        }

        btnCompleteTrip.setOnClickListener {
            showPreCompletionModal()
        }
    }

    private fun checkBatteryExemption() {
        if (!OemBatteryOptimizationHelper.isIgnoringBatteryOptimizations(this)) {
            OemBatteryOptimizationHelper.requestIgnoreBatteryOptimizations(this)
            OemBatteryOptimizationHelper.openOemAutostartSettings(this)
        }
    }

    private fun toggleDuty() {
        // Enforce -₹300 Wallet Lock Check
        if (!isOnline && walletBalance < -300.0) {
            Toast.makeText(
                this,
                "⚠️ Wallet balance is below -₹300. Please recharge to go online.",
                Toast.LENGTH_LONG
            ).show()
            return
        }

        isOnline = !isOnline

        val serviceIntent = Intent(this, DriverLocationService::class.java).apply {
            action = if (isOnline) DriverLocationService.ACTION_START else DriverLocationService.ACTION_STOP
            putExtra("DRIVER_ID", driverId)
            putExtra("RIDE_ID", activeRideId ?: "")
        }
        startService(serviceIntent)

        if (isOnline) {
            btnDutyToggle.text = "GO OFFLINE\n(ஆஃப்லைன் செல்)"
            btnDutyToggle.setBackgroundColor(0xFFEF4444.toInt()) // Red
            tvDutyStatus.text = "ONLINE (வேலையில் உள்ளீர்கள்)"
            tvDutyStatus.setTextColor(0xFF16A34A.toInt()) // Green
        } else {
            btnDutyToggle.text = "GO ONLINE\n(ஆன்லைன் செல்)"
            btnDutyToggle.setBackgroundColor(0xFF16A34A.toInt()) // Green
            tvDutyStatus.text = "OFFLINE (வேலையில் இல்லை)"
            tvDutyStatus.setTextColor(0xFF9CA3AF.toInt()) // Gray
        }
    }

    private fun updateWalletUi() {
        tvWalletBalance.text = "₹${walletBalance.toInt()}"
        if (walletBalance < -300.0) {
            cardWalletLock.visibility = View.VISIBLE
            tvWalletBalance.setTextColor(0xFFEF4444.toInt())
        } else {
            cardWalletLock.visibility = View.GONE
            tvWalletBalance.setTextColor(0xFFFFFFFF.toInt())
        }
    }

    private fun launchUpiPayment() {
        val upiUri = Uri.parse("upi://pay?pa=karurtaxi@icici&pn=KarurTaxi&am=500&cu=INR&tn=DriverRecharge")
        val upiIntent = Intent(Intent.ACTION_VIEW, upiUri)
        try {
            startActivity(Intent.createChooser(upiIntent, "Pay with UPI"))
        } catch (e: Exception) {
            Toast.makeText(this, "No UPI App found (GPay, PhonePe, Paytm)", Toast.LENGTH_SHORT).show()
        }
    }

    private fun onArrivedAtPickup() {
        btnArrived.visibility = View.GONE
        btnEnterPin.visibility = View.VISIBLE
        Toast.makeText(this, "Customer notified that you have arrived", Toast.LENGTH_SHORT).show()
    }

    private fun showOtpKeypadModal() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_numeric_otp_pad, null)
        val etPin = dialogView.findViewById<EditText>(R.id.et_driver_entered_pin)

        val dialog = AlertDialog.Builder(this)
            .setTitle("Enter 4-Digit Customer PIN")
            .setView(dialogView)
            .setPositiveButton("VERIFY & START") { d, _ ->
                val entered = etPin.text.toString().trim()
                if (entered.length == 4) {
                    Toast.makeText(this, "Trip Started Successfully!", Toast.LENGTH_SHORT).show()
                    btnEnterPin.visibility = View.GONE
                    btnCompleteTrip.visibility = View.VISIBLE
                    d.dismiss()
                } else {
                    Toast.makeText(this, "Please enter 4 digits", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .create()

        dialog.show()
    }

    private fun showPreCompletionModal() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_pre_completion, null)
        val etToll = dialogView.findViewById<EditText>(R.id.et_toll_charges)
        val etParking = dialogView.findViewById<EditText>(R.id.et_parking_charges)

        AlertDialog.Builder(this)
            .setTitle("Toll & Parking Charges (சுங்கச்சாவடி / பார்க்கிங்)")
            .setView(dialogView)
            .setPositiveButton("CONFIRM & COMPLETE TRIP") { _, _ ->
                val toll = etToll.text.toString().toDoubleOrNull() ?: 0.0
                val parking = etParking.text.toString().toDoubleOrNull() ?: 0.0
                completeRide(toll, parking)
            }
            .setNegativeButton("No Toll", { _, _ -> completeRide(0.0, 0.0) })
            .show()
    }

    private fun completeRide(toll: Double, parking: Double) {
        cardActiveRide.visibility = View.GONE
        Toast.makeText(this, "Trip completed! Toll: ₹$toll, Parking: ₹$parking", Toast.LENGTH_LONG).show()
    }
}
